import { Injectable, BadRequestException } from '@nestjs/common';

export interface Hl7Message {
  messageType: string;
  triggerEvent: string;
  controlId: string;
  segments: Hl7Segment[];
  raw: string;
}

export interface Hl7Segment {
  type: string;
  fields: string[];
  raw: string;
}

export interface AdtPatientInfo {
  patientId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  ssn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
}

export interface AdtVisitInfo {
  visitNumber: string;
  patientClass: string;
  assignedLocation?: string;
  admitDateTime?: string;
  dischargeDateTime?: string;
  attendingProviderId?: string;
  attendingProviderName?: string;
}

@Injectable()
export class Hl7v2Parser {
  private readonly FIELD_SEPARATOR = '|';
  private readonly COMPONENT_SEPARATOR = '^';
  private readonly SUBCOMPONENT_SEPARATOR = '&';
  private readonly REPETITION_SEPARATOR = '~';
  private readonly ESCAPE_CHARACTER = '\\';

  parse(rawMessage: string): Hl7Message {
    if (!rawMessage || !rawMessage.startsWith('MSH')) {
      throw new BadRequestException('Invalid HL7 message: must start with MSH segment');
    }

    const lines = rawMessage.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const segments: Hl7Segment[] = [];

    for (const line of lines) {
      const segment = this.parseSegment(line);
      if (segment) segments.push(segment);
    }

    const msh = segments.find((s) => s.type === 'MSH');
    if (!msh || msh.fields.length < 9) {
      throw new BadRequestException('Invalid HL7 message: MSH segment incomplete');
    }

    const messageTypeField = msh.fields[8] || '';
    const [messageType, triggerEvent] = messageTypeField.split(this.COMPONENT_SEPARATOR);

    return {
      messageType: messageType || 'UNK',
      triggerEvent: triggerEvent || '',
      controlId: msh.fields[9] || `CTL-${Date.now()}`,
      segments,
      raw: rawMessage,
    };
  }

  private parseSegment(line: string): Hl7Segment | null {
    const trimmed = line.trim();
    if (trimmed.length < 3) return null;

    const type = trimmed.substring(0, 3);
    let fields: string[];

    if (type === 'MSH') {
      // MSH is special: field 1 is the separator itself
      fields = ['|', ...trimmed.substring(4).split(this.FIELD_SEPARATOR)];
    } else {
      fields = trimmed.split(this.FIELD_SEPARATOR).slice(1);
    }

    return { type, fields, raw: trimmed };
  }

  getSegment(message: Hl7Message, type: string): Hl7Segment | undefined {
    return message.segments.find((s) => s.type === type);
  }

  getSegments(message: Hl7Message, type: string): Hl7Segment[] {
    return message.segments.filter((s) => s.type === type);
  }

  getComponent(field: string, index: number): string {
    const components = (field || '').split(this.COMPONENT_SEPARATOR);
    return components[index - 1] || '';
  }

  // --- Message Generation ---

  generateAck(originalMessage: Hl7Message, ackCode: 'AA' | 'AE' | 'AR', textMessage?: string): string {
    const now = this.formatDateTime(new Date());
    const msh = originalMessage.segments.find((s) => s.type === 'MSH');
    const sendingApp = msh?.fields[2] || 'CareForge';
    const sendingFac = msh?.fields[3] || 'EHR';
    const receivingApp = msh?.fields[4] || '';
    const receivingFac = msh?.fields[5] || '';

    const segments = [
      `MSH|^~\\&|${sendingApp}|${sendingFac}|${receivingApp}|${receivingFac}|${now}||ACK|${originalMessage.controlId}_ACK|P|2.5.1`,
      `MSA|${ackCode}|${originalMessage.controlId}|${textMessage || ''}`,
    ];

    return segments.join('\r');
  }

  generateAdtA01(patient: AdtPatientInfo, visit: AdtVisitInfo): string {
    const now = this.formatDateTime(new Date());
    const controlId = `ADT-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|EHR|||${now}||ADT^A01|${controlId}|P|2.5.1`,
      `EVN|A01|${now}`,
      `PID|1||${patient.patientId}||${patient.lastName}^${patient.firstName}^${patient.middleName || ''}||${patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : ''}|${patient.gender || 'U'}|||${patient.address || ''}^^${patient.city || ''}^${patient.state || ''}^${patient.zipCode || ''}||${patient.phone || ''}|||${patient.ssn || ''}`,
      `PV1|1|${visit.patientClass}|${visit.assignedLocation || ''}||||${visit.attendingProviderId || ''}^${visit.attendingProviderName || ''}||||||||||${visit.visitNumber}|||||||||||||||||||||||||${visit.admitDateTime ? this.formatDateTime(new Date(visit.admitDateTime)) : now}||${visit.dischargeDateTime ? this.formatDateTime(new Date(visit.dischargeDateTime)) : ''}`,
    ];

    return segments.join('\r');
  }

  generateAdtA08(patient: AdtPatientInfo, visit: AdtVisitInfo): string {
    const now = this.formatDateTime(new Date());
    const controlId = `ADT-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|EHR|||${now}||ADT^A08|${controlId}|P|2.5.1`,
      `EVN|A08|${now}`,
      `PID|1||${patient.patientId}||${patient.lastName}^${patient.firstName}^${patient.middleName || ''}||${patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : ''}|${patient.gender || 'U'}|||${patient.address || ''}^^${patient.city || ''}^${patient.state || ''}^${patient.zipCode || ''}||${patient.phone || ''}|||${patient.ssn || ''}`,
      `PV1|1|${visit.patientClass}|${visit.assignedLocation || ''}||||${visit.attendingProviderId || ''}^${visit.attendingProviderName || ''}||||||||||${visit.visitNumber}`,
    ];

    return segments.join('\r');
  }

  generateAdtA03(patient: AdtPatientInfo, visit: AdtVisitInfo): string {
    const now = this.formatDateTime(new Date());
    const controlId = `ADT-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|EHR|||${now}||ADT^A03|${controlId}|P|2.5.1`,
      `EVN|A03|${now}`,
      `PID|1||${patient.patientId}||${patient.lastName}^${patient.firstName}^${patient.middleName || ''}||${patient.dateOfBirth ? this.formatDate(patient.dateOfBirth) : ''}|${patient.gender || 'U'}`,
      `PV1|1|${visit.patientClass}|${visit.assignedLocation || ''}||||${visit.attendingProviderId || ''}^${visit.attendingProviderName || ''}||||||||||${visit.visitNumber}|||||||||||||||||||||||||${visit.admitDateTime ? this.formatDateTime(new Date(visit.admitDateTime)) : ''}||${now}`,
    ];

    return segments.join('\r');
  }

  generateOrmO01(patientId: string, patientName: string, orderId: string, orderCode: string, orderDescription: string, providerId: string): string {
    const now = this.formatDateTime(new Date());
    const controlId = `ORM-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|EHR|||${now}||ORM^O01|${controlId}|P|2.5.1`,
      `PID|1||${patientId}||${patientName}`,
      `ORC|NW|${orderId}|||||^^^${now}||${now}||${providerId}`,
      `OBR|1|${orderId}||${orderCode}^${orderDescription}|||||${now}|||||||||${providerId}`,
    ];

    return segments.join('\r');
  }

  generateOruR01(patientId: string, patientName: string, orderId: string, observations: { code: string; name: string; value: string; unit: string; range?: string; flag?: string }[]): string {
    const now = this.formatDateTime(new Date());
    const controlId = `ORU-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|LAB|||${now}||ORU^R01|${controlId}|P|2.5.1`,
      `PID|1||${patientId}||${patientName}`,
      `ORC|RE|${orderId}`,
      `OBR|1|${orderId}||LAB^Laboratory Panel|||||${now}`,
    ];

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      segments.push(`OBX|${i + 1}|NM|${obs.code}^${obs.name}||${obs.value}|${obs.unit}|${obs.range || ''}|${obs.flag || 'N'}|||F||${now}`);
    }

    return segments.join('\r');
  }

  generateMfnM02(codeSystem: string, codes: { code: string; description: string }[]): string {
    const now = this.formatDateTime(new Date());
    const controlId = `MFN-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|CareForge|EHR|||${now}||MFN^M02|${controlId}|P|2.5.1`,
      `MFI|${codeSystem}||MUPD||${now}|NE`,
    ];

    for (const item of codes) {
      segments.push(`MFE|MUPD|${now}||${item.code}`);
      segments.push(`CDM|${item.code}^${item.description}`);
    }

    return segments.join('\r');
  }

  // --- Utility ---

  private formatDateTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 8);
  }
}
