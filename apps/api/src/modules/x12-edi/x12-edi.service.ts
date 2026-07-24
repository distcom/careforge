import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { X12Parser, ClaimInfo, ServiceLine, EligibilityInquiry, RemittanceInfo, EligibilityResponse } from './x12.parser';

export interface ClaimSubmissionResult {
  success: boolean;
  claimId: string;
  x12Transaction: string;
  controlNumber: string;
  message?: string;
}

export interface EligibilityCheckResult {
  success: boolean;
  patientId: string;
  x12Inquiry: string;
  message?: string;
}

@Injectable()
export class X12EdiService {
  private readonly logger = new Logger(X12EdiService.name);
  private readonly SUBMITTER_ID = 'CAREFORGE001';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private parser: X12Parser,
  ) {}

  // --- 837 Claim Submission ---

  async generateClaim837(chargeId: string, userId?: string): Promise<ClaimSubmissionResult> {
    const charge = await this.prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        patient: true,
        encounter: { include: { provider: true } },
      },
    });

    if (!charge) throw new NotFoundException('Charge not found');
    if (charge.codingStatus !== 'APPROVED') {
      throw new BadRequestException('Charge must be approved before claim submission');
    }

    const claimInfo: ClaimInfo = {
      claimId: charge.claimNumber || `CLM-${Date.now()}`,
      patientId: charge.patient.medicalRecordNumber,
      patientName: `${charge.patient.firstName} ${charge.patient.lastName}`,
      providerNpi: charge.encounter?.provider?.npi || '1234567890',
      payerId: charge.payerId || 'PAYER001',
      totalCharge: charge.amount,
      placeOfService: '11', // Office
      dateOfService: charge.serviceDate || new Date().toISOString().split('T')[0],
      diagnoses: charge.icd10Codes || [],
      serviceLines: [{
        lineNumber: 1,
        procedureCode: charge.cptCode || '99213',
        charge: charge.amount,
        units: 1,
        dateOfService: charge.serviceDate || new Date().toISOString().split('T')[0],
      }],
    };

    const x12Transaction = this.parser.generate837(claimInfo, this.SUBMITTER_ID, claimInfo.payerId);

    await this.auditService.log({
      action: 'X12_837_GENERATED',
      entityType: 'Charge',
      entityId: chargeId,
      userId,
      details: { claimId: claimInfo.claimId, payerId: claimInfo.payerId, amount: charge.amount },
    });

    return {
      success: true,
      claimId: claimInfo.claimId,
      x12Transaction,
      controlNumber: `837-${Date.now()}`,
      message: '837 claim generated successfully',
    };
  }

  async submitBatchClaims(chargeIds: string[], userId?: string): Promise<{ submitted: number; failed: number; results: ClaimSubmissionResult[] }> {
    const results: ClaimSubmissionResult[] = [];
    let submitted = 0;
    let failed = 0;

    for (const chargeId of chargeIds) {
      try {
        const result = await this.generateClaim837(chargeId, userId);
        results.push(result);
        submitted++;
      } catch (error) {
        results.push({
          success: false,
          claimId: chargeId,
          x12Transaction: '',
          controlNumber: '',
          message: error.message,
        });
        failed++;
      }
    }

    await this.auditService.log({
      action: 'X12_837_BATCH_SUBMITTED',
      entityType: 'Batch',
      entityId: `BATCH-${Date.now()}`,
      userId,
      details: { submitted, failed, total: chargeIds.length },
    });

    return { submitted, failed, results };
  }

  // --- 835 Remittance Processing ---

  async processRemittance835(rawTransaction: string, userId?: string): Promise<RemittanceInfo> {
    const transaction = this.parser.parse(rawTransaction);

    if (transaction.transactionType !== '835') {
      throw new BadRequestException('Invalid transaction type: expected 835');
    }

    const remittance = this.parser.parse835(transaction);

    // Find and update the charge
    if (remittance.claimId) {
      const charge = await this.prisma.charge.findFirst({
        where: { claimNumber: remittance.claimId },
      });

      if (charge) {
        await this.prisma.charge.update({
          where: { id: charge.id },
          data: {
            status: remittance.totalPaid > 0 ? 'PAID' : 'DENIED',
            amountPaid: remittance.totalPaid,
          },
        });

        await this.auditService.log({
          action: 'X12_835_PROCESSED',
          entityType: 'Charge',
          entityId: charge.id,
          userId,
          details: {
            claimId: remittance.claimId,
            paid: remittance.totalPaid,
            denied: remittance.totalDenied,
          },
        });
      }
    }

    return remittance;
  }

  // --- 270/271 Eligibility ---

  async checkEligibility270(patientId: string, payerId: string, serviceType: string, userId?: string): Promise<EligibilityCheckResult> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const inquiry: EligibilityInquiry = {
      patientId: patient.medicalRecordNumber,
      patientName: `${patient.firstName} ${patient.lastName}`,
      payerId,
      memberId: patient.medicalRecordNumber,
      serviceType,
      dateOfService: new Date().toISOString().split('T')[0],
    };

    const x12Inquiry = this.parser.generate270(inquiry, this.SUBMITTER_ID, payerId);

    await this.auditService.log({
      action: 'X12_270_GENERATED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { payerId, serviceType },
    });

    return {
      success: true,
      patientId,
      x12Inquiry,
      message: '270 eligibility inquiry generated',
    };
  }

  async processEligibilityResponse271(rawTransaction: string, userId?: string): Promise<EligibilityResponse> {
    const transaction = this.parser.parse(rawTransaction);

    if (transaction.transactionType !== '271') {
      throw new BadRequestException('Invalid transaction type: expected 271');
    }

    const response = this.parser.parse271(transaction);

    await this.auditService.log({
      action: 'X12_271_PROCESSED',
      entityType: 'Eligibility',
      entityId: response.memberId,
      userId,
      details: { active: response.active, benefits: response.benefits.length },
    });

    return response;
  }

  // --- Transaction Processing ---

  async processInboundTransaction(rawTransaction: string, userId?: string): Promise<any> {
    const transaction = this.parser.parse(rawTransaction);

    await this.auditService.log({
      action: 'X12_TRANSACTION_RECEIVED',
      entityType: 'X12Transaction',
      entityId: transaction.controlNumber,
      userId,
      details: { type: transaction.transactionType, version: transaction.version },
    });

    switch (transaction.transactionType) {
      case '835':
        return this.processRemittance835(rawTransaction, userId);
      case '271':
        return this.processEligibilityResponse271(rawTransaction, userId);
      case '999':
        return { type: '999', status: 'Acknowledged', transaction };
      case '277':
        return { type: '277', status: 'Claim status received', transaction };
      default:
        throw new BadRequestException(`Unsupported transaction type: ${transaction.transactionType}`);
    }
  }

  // --- Reporting ---

  async getClaimsSummary(userId?: string): Promise<any> {
    const [totalCharges, pendingClaims, paidClaims, deniedClaims] = await Promise.all([
      this.prisma.charge.count({ where: { codingStatus: 'APPROVED' } }),
      this.prisma.charge.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.charge.count({ where: { status: 'PAID' } }),
      this.prisma.charge.count({ where: { status: 'DENIED' } }),
    ]);

    const totalBilled = await this.prisma.charge.aggregate({
      where: { codingStatus: 'APPROVED' },
      _sum: { amount: true },
    });

    const totalCollected = await this.prisma.charge.aggregate({
      where: { status: 'PAID' },
      _sum: { amountPaid: true },
    });

    return {
      totalCharges,
      pendingClaims,
      paidClaims,
      deniedClaims,
      totalBilled: totalBilled._sum.amount || 0,
      totalCollected: totalCollected._sum.amountPaid || 0,
      collectionRate: totalBilled._sum.amount ? ((totalCollected._sum.amountPaid || 0) / totalBilled._sum.amount * 100).toFixed(1) : '0',
    };
  }
}
