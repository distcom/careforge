import { Injectable, BadRequestException } from '@nestjs/common';

export interface X12Transaction {
  transactionType: string;
  version: string;
  controlNumber: string;
  segments: X12Segment[];
  raw: string;
}

export interface X12Segment {
  id: string;
  elements: string[];
  raw: string;
}

export interface ClaimInfo {
  claimId: string;
  patientId: string;
  patientName: string;
  providerNpi: string;
  payerId: string;
  totalCharge: number;
  serviceLines: ServiceLine[];
  diagnoses: string[];
  placeOfService: string;
  dateOfService: string;
}

export interface ServiceLine {
  lineNumber: number;
  procedureCode: string;
  modifier?: string;
  charge: number;
  units: number;
  dateOfService: string;
}

export interface RemittanceInfo {
  claimId: string;
  payerClaimId: string;
  patientId: string;
  totalPaid: number;
  totalAllowed: number;
  totalDenied: number;
  adjustments: Adjustment[];
  serviceLinePayments: ServiceLinePayment[];
}

export interface Adjustment {
  groupCode: string;
  reasonCode: string;
  amount: number;
}

export interface ServiceLinePayment {
  lineNumber: number;
  procedureCode: string;
  charge: number;
  allowed: number;
  paid: number;
  adjustments: Adjustment[];
}

export interface EligibilityInquiry {
  patientId: string;
  patientName: string;
  payerId: string;
  memberId: string;
  serviceType: string;
  dateOfService: string;
}

export interface EligibilityResponse {
  patientId: string;
  memberId: string;
  payerId: string;
  active: boolean;
  coverageLevel: string;
  planName: string;
  benefits: BenefitInfo[];
}

export interface BenefitInfo {
  serviceType: string;
  coverageLevel: string;
  benefitAmount?: number;
  benefitPercent?: number;
  remainingAmount?: number;
  deductibleMet?: number;
  deductibleRemaining?: number;
  copay?: number;
  coinsurance?: number;
}

@Injectable()
export class X12Parser {
  private readonly SEGMENT_TERMINATOR = '~';
  private readonly ELEMENT_SEPARATOR = '*';
  private readonly SUBELEMENT_SEPARATOR = ':';

  parse(rawTransaction: string): X12Transaction {
    if (!rawTransaction || !rawTransaction.includes('ISA')) {
      throw new BadRequestException('Invalid X12 transaction: must contain ISA segment');
    }

    const segments: X12Segment[] = [];
    const segmentStrings = rawTransaction.split(this.SEGMENT_TERMINATOR).filter((s) => s.trim().length > 0);

    for (const segStr of segmentStrings) {
      const segment = this.parseSegment(segStr.trim());
      if (segment) segments.push(segment);
    }

    const isa = segments.find((s) => s.id === 'ISA');
    const gs = segments.find((s) => s.id === 'GS');
    const st = segments.find((s) => s.id === 'ST');

    if (!st || st.elements.length < 2) {
      throw new BadRequestException('Invalid X12 transaction: missing or incomplete ST segment');
    }

    return {
      transactionType: st.elements[0],
      version: gs?.elements[7] || '005010X222A1',
      controlNumber: st.elements[1] || `CTL-${Date.now()}`,
      segments,
      raw: rawTransaction,
    };
  }

  private parseSegment(raw: string): X12Segment | null {
    if (raw.length < 2) return null;
    const elements = raw.split(this.ELEMENT_SEPARATOR);
    return {
      id: elements[0],
      elements: elements.slice(1),
      raw,
    };
  }

  getSegment(transaction: X12Transaction, id: string): X12Segment | undefined {
    return transaction.segments.find((s) => s.id === id);
  }

  getSegments(transaction: X12Transaction, id: string): X12Segment[] {
    return transaction.segments.filter((s) => s.id === id);
  }

  // --- 837 Claim Generation ---

  generate837(claim: ClaimInfo, submitterId: string, receiverId: string): string {
    const now = this.formatDate(new Date());
    const nowTime = this.formatTime(new Date());
    const controlNumber = `837-${Date.now()}`;

    const segments: string[] = [
      // ISA - Interchange Control Header
      `ISA*00*          *00*          *ZZ*${submitterId.padEnd(15)}*ZZ*${receiverId.padEnd(15)}*${now.substring(2)}*${nowTime}*^*00501*000000001*0*P*:`,
      // GS - Functional Group Header
      `GS*HC*${submitterId}*${receiverId}*${now}*${nowTime}*1*X*005010X222A1`,
      // ST - Transaction Set Header
      `ST*837*${controlNumber}*005010X222A1`,
      // BHT - Beginning of Hierarchical Transaction
      `BHT*0019*00*${controlNumber}*${now}*${nowTime}*CH`,
      // NM1 - Submitter
      `NM1*41*2*CareForge EHR*****46*${submitterId}`,
      // NM1 - Receiver
      `NM1*40*2*Payer*****46*${receiverId}`,
      // HL - Billing Provider
      `HL*1**20*1`,
      `NM1*85*2*CareForge Medical Group*****XX*${claim.providerNpi}`,
      `N3*123 Medical Center Dr`,
      `N4*Healthcare City*CA*90210`,
      `REF*EI*123456789`,
      // HL - Subscriber
      `HL*2*1*22*1`,
      `SBR*P*18******CI`,
      `NM1*IL*1*${claim.patientName.split(' ')[1] || 'Patient'}*${claim.patientName.split(' ')[0] || 'John'}*****MI*${claim.patientId}`,
      `N3*456 Patient Ave`,
      `N4*Patient City*CA*90211`,
      `DMG*D8*19800101*M`,
      // HL - Patient
      `HL*3*2*23*0`,
      `PAT*19`,
      `NM1*QC*1*${claim.patientName.split(' ')[1] || 'Patient'}*${claim.patientName.split(' ')[0] || 'John'}`,
      `N3*456 Patient Ave`,
      `N4*Patient City*CA*90211`,
      `DMG*D8*19800101*M`,
      // CLM - Claim
      `CLM*${claim.claimId}*${claim.totalCharge.toFixed(2)}***11:B:1*Y*A*Y*Y`,
      `DTP*435*D8*${claim.dateOfService.replace(/-/g, '')}`,
      `HI*BK:${claim.diagnoses[0] || 'Z0000'}`,
      // Service Lines
      ...claim.serviceLines.flatMap((line) => [
        `LX*${line.lineNumber}`,
        `SV1*HC:${line.procedureCode}${line.modifier ? ':' + line.modifier : ''}*${line.charge.toFixed(2)}*UN*${line.units}***1`,
        `DTP*472*D8*${line.dateOfService.replace(/-/g, '')}`,
      ]),
      // SE - Transaction Set Trailer
      `SE*${segments.length + 3}*${controlNumber}`,
      // GE - Functional Group Trailer
      `GE*1*1`,
      // IEA - Interchange Control Trailer
      `IEA*1*000000001`,
    ];

    return segments.join(this.SEGMENT_TERMINATOR) + this.SEGMENT_TERMINATOR;
  }

  // --- 270 Eligibility Inquiry Generation ---

  generate270(inquiry: EligibilityInquiry, submitterId: string, receiverId: string): string {
    const now = this.formatDate(new Date());
    const nowTime = this.formatTime(new Date());
    const controlNumber = `270-${Date.now()}`;

    const segments: string[] = [
      `ISA*00*          *00*          *ZZ*${submitterId.padEnd(15)}*ZZ*${receiverId.padEnd(15)}*${now.substring(2)}*${nowTime}*^*00501*000000001*0*P*:`,
      `GS*HS*${submitterId}*${receiverId}*${now}*${nowTime}*1*X*005010X279A1`,
      `ST*270*${controlNumber}*005010X279A1`,
      `BHT*0022*13*${controlNumber}*${now}*${nowTime}`,
      `HL*1**20*1`,
      `NM1*PR*2*Payer*****PI*${inquiry.payerId}`,
      `HL*2*1*21*1`,
      `TRN*1*${controlNumber}*9${submitterId.substring(0, 9)}`,
      `NM1*1P*2*CareForge Medical Group*****XX*1234567890`,
      `HL*3*2*22*0`,
      `TRN*2*${inquiry.patientId}*9${submitterId.substring(0, 9)}`,
      `NM1*IL*1*${inquiry.patientName.split(' ')[1] || 'Patient'}*${inquiry.patientName.split(' ')[0] || 'John'}*****MI*${inquiry.memberId}`,
      `DMG*D8*19800101*M`,
      `DTP*307*D8*${inquiry.dateOfService.replace(/-/g, '')}`,
      `EQ*${inquiry.serviceType}`,
      `SE*${segments.length + 1}*${controlNumber}`,
      `GE*1*1`,
      `IEA*1*000000001`,
    ];

    return segments.join(this.SEGMENT_TERMINATOR) + this.SEGMENT_TERMINATOR;
  }

  // --- 835 Remittance Parsing ---

  parse835(transaction: X12Transaction): RemittanceInfo {
    const clp = this.getSegment(transaction, 'CLP');
    const cas = this.getSegments(transaction, 'CAS');
    const svc = this.getSegments(transaction, 'SVC');

    if (!clp) {
      throw new BadRequestException('Invalid 835: missing CLP segment');
    }

    const claimId = clp.elements[0] || '';
    const totalCharge = parseFloat(clp.elements[2] || '0');
    const totalPaid = parseFloat(clp.elements[3] || '0');
    const payerClaimId = clp.elements[4] || '';

    const adjustments: Adjustment[] = cas.map((c) => ({
      groupCode: c.elements[0] || '',
      reasonCode: c.elements[1] || '',
      amount: parseFloat(c.elements[2] || '0'),
    }));

    const serviceLinePayments: ServiceLinePayment[] = svc.map((s) => ({
      lineNumber: parseInt(s.elements[0]?.split(':')[1] || '1'),
      procedureCode: s.elements[0]?.split(':')[1] || '',
      charge: parseFloat(s.elements[1] || '0'),
      allowed: parseFloat(s.elements[2] || '0'),
      paid: parseFloat(s.elements[3] || '0'),
      adjustments: [],
    }));

    const totalAllowed = serviceLinePayments.reduce((sum, s) => sum + s.allowed, 0);
    const totalDenied = totalCharge - totalPaid;

    return {
      claimId,
      payerClaimId,
      patientId: '',
      totalPaid,
      totalAllowed,
      totalDenied,
      adjustments,
      serviceLinePayments,
    };
  }

  // --- 271 Eligibility Response Parsing ---

  parse271(transaction: X12Transaction): EligibilityResponse {
    const nm1 = this.getSegments(transaction, 'NM1').find((n) => n.elements[0] === 'IL');
    const eb = this.getSegments(transaction, 'EB');

    const memberId = nm1?.elements[8] || '';
    const active = eb.some((e) => e.elements[0] === '1');

    const benefits: BenefitInfo[] = eb.map((e) => ({
      serviceType: e.elements[1] || '',
      coverageLevel: e.elements[2] || '',
      benefitAmount: e.elements[4] ? parseFloat(e.elements[4]) : undefined,
      benefitPercent: e.elements[5] ? parseFloat(e.elements[5]) : undefined,
    }));

    return {
      patientId: '',
      memberId,
      payerId: '',
      active,
      coverageLevel: benefits[0]?.coverageLevel || 'IND',
      planName: 'Health Plan',
      benefits,
    };
  }

  // --- Utility ---

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 8);
  }

  private formatTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(8, 12);
  }
}
