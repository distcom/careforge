import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Hl7v2Parser, Hl7Message, AdtPatientInfo, AdtVisitInfo } from './hl7v2.parser';

export interface Hl7ProcessingResult {
  success: boolean;
  messageType: string;
  triggerEvent: string;
  controlId: string;
  ackCode: 'AA' | 'AE' | 'AR';
  message?: string;
  data?: any;
}

@Injectable()
export class Hl7v2Service {
  private readonly logger = new Logger(Hl7v2Service.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private parser: Hl7v2Parser,
  ) {}

  async processInboundMessage(rawMessage: string, userId?: string): Promise<Hl7ProcessingResult> {
    let message: Hl7Message;
    try {
      message = this.parser.parse(rawMessage);
    } catch (error) {
      return {
        success: false,
        messageType: 'UNK',
        triggerEvent: '',
        controlId: 'UNKNOWN',
        ackCode: 'AR',
        message: `Parse error: ${error.message}`,
      };
    }

    await this.auditService.log({
      action: 'HL7_MESSAGE_RECEIVED',
      entityType: 'Hl7Message',
      entityId: message.controlId,
      userId,
      details: { messageType: message.messageType, triggerEvent: message.triggerEvent },
    });

    try {
      switch (message.messageType) {
        case 'ADT':
          return await this.processAdtMessage(message, userId);
        case 'ORM':
          return await this.processOrmMessage(message, userId);
        case 'ORU':
          return await this.processOruMessage(message, userId);
        case 'MFN':
          return await this.processMfnMessage(message, userId);
        default:
          return {
            success: false,
            messageType: message.messageType,
            triggerEvent: message.triggerEvent,
            controlId: message.controlId,
            ackCode: 'AR',
            message: `Unsupported message type: ${message.messageType}`,
          };
      }
    } catch (error) {
      this.logger.error(`Error processing HL7 message: ${error.message}`, error.stack);
      return {
        success: false,
        messageType: message.messageType,
        triggerEvent: message.triggerEvent,
        controlId: message.controlId,
        ackCode: 'AE',
        message: `Processing error: ${error.message}`,
      };
    }
  }

  private async processAdtMessage(message: Hl7Message, userId?: string): Promise<Hl7ProcessingResult> {
    const pid = this.parser.getSegment(message, 'PID');
    const pv1 = this.parser.getSegment(message, 'PV1');

    if (!pid) {
      return { success: false, messageType: 'ADT', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AE', message: 'Missing PID segment' };
    }

    const patientInfo = this.extractPatientInfo(pid);

    switch (message.triggerEvent) {
      case 'A01': // Admit
      case 'A04': // Register
      case 'A08': // Update
        return await this.handleAdtAdmitOrUpdate(message, patientInfo, pv1, userId);
      case 'A03': // Discharge
        return await this.handleAdtDischarge(message, patientInfo, pv1, userId);
      default:
        return { success: true, messageType: 'ADT', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AA', message: 'Acknowledged' };
    }
  }

  private async handleAdtAdmitOrUpdate(message: Hl7Message, patientInfo: AdtPatientInfo, pv1: any, userId?: string): Promise<Hl7ProcessingResult> {
    // Find or create patient
    let patient = await this.prisma.patient.findFirst({
      where: { medicalRecordNumber: patientInfo.patientId, deletedAt: null },
    });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: {
          medicalRecordNumber: patientInfo.patientId,
          firstName: patientInfo.firstName,
          lastName: patientInfo.lastName,
          middleName: patientInfo.middleName,
          dateOfBirth: patientInfo.dateOfBirth,
          gender: patientInfo.gender,
          ssn: patientInfo.ssn,
          address: patientInfo.address,
          city: patientInfo.city,
          state: patientInfo.state,
          zipCode: patientInfo.zipCode,
          phone: patientInfo.phone,
          status: 'ACTIVE',
        },
      });
    } else if (message.triggerEvent === 'A08') {
      patient = await this.prisma.patient.update({
        where: { id: patient.id },
        data: {
          firstName: patientInfo.firstName || patient.firstName,
          lastName: patientInfo.lastName || patient.lastName,
          address: patientInfo.address || patient.address,
          city: patientInfo.city || patient.city,
          state: patientInfo.state || patient.state,
          zipCode: patientInfo.zipCode || patient.zipCode,
          phone: patientInfo.phone || patient.phone,
        },
      });
    }

    await this.auditService.log({
      action: `HL7_ADT_${message.triggerEvent}_PROCESSED`,
      entityType: 'Patient',
      entityId: patient.id,
      userId,
      details: { mrn: patientInfo.patientId, triggerEvent: message.triggerEvent },
    });

    return {
      success: true,
      messageType: 'ADT',
      triggerEvent: message.triggerEvent,
      controlId: message.controlId,
      ackCode: 'AA',
      message: `Patient ${message.triggerEvent === 'A08' ? 'updated' : 'registered'}: ${patient.id}`,
      data: { patientId: patient.id },
    };
  }

  private async handleAdtDischarge(message: Hl7Message, patientInfo: AdtPatientInfo, pv1: any, userId?: string): Promise<Hl7ProcessingResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { medicalRecordNumber: patientInfo.patientId, deletedAt: null },
    });

    if (!patient) {
      return { success: false, messageType: 'ADT', triggerEvent: 'A03', controlId: message.controlId, ackCode: 'AE', message: `Patient not found: ${patientInfo.patientId}` };
    }

    await this.auditService.log({
      action: 'HL7_ADT_A03_PROCESSED',
      entityType: 'Patient',
      entityId: patient.id,
      userId,
      details: { mrn: patientInfo.patientId },
    });

    return {
      success: true,
      messageType: 'ADT',
      triggerEvent: 'A03',
      controlId: message.controlId,
      ackCode: 'AA',
      message: `Discharge acknowledged for patient: ${patient.id}`,
      data: { patientId: patient.id },
    };
  }

  private async processOrmMessage(message: Hl7Message, userId?: string): Promise<Hl7ProcessingResult> {
    const pid = this.parser.getSegment(message, 'PID');
    const orc = this.parser.getSegment(message, 'ORC');
    const obr = this.parser.getSegment(message, 'OBR');

    if (!pid || !obr) {
      return { success: false, messageType: 'ORM', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AE', message: 'Missing required segments' };
    }

    const patientMrn = pid.fields[2] || '';
    const orderId = orc?.fields[1] || `ORD-${Date.now()}`;
    const orderCode = this.parser.getComponent(obr.fields[3] || '', 1);
    const orderName = this.parser.getComponent(obr.fields[3] || '', 2);

    const patient = await this.prisma.patient.findFirst({
      where: { medicalRecordNumber: patientMrn, deletedAt: null },
    });

    if (!patient) {
      return { success: false, messageType: 'ORM', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AE', message: `Patient not found: ${patientMrn}` };
    }

    await this.auditService.log({
      action: 'HL7_ORM_PROCESSED',
      entityType: 'LabOrder',
      entityId: orderId,
      userId,
      details: { patientId: patient.id, orderCode, orderName },
    });

    return {
      success: true,
      messageType: 'ORM',
      triggerEvent: message.triggerEvent,
      controlId: message.controlId,
      ackCode: 'AA',
      message: `Order received: ${orderName}`,
      data: { orderId, patientId: patient.id, orderCode, orderName },
    };
  }

  private async processOruMessage(message: Hl7Message, userId?: string): Promise<Hl7ProcessingResult> {
    const pid = this.parser.getSegment(message, 'PID');
    const obr = this.parser.getSegment(message, 'OBR');
    const obxSegments = this.parser.getSegments(message, 'OBX');

    if (!pid) {
      return { success: false, messageType: 'ORU', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AE', message: 'Missing PID segment' };
    }

    const patientMrn = pid.fields[2] || '';
    const patient = await this.prisma.patient.findFirst({
      where: { medicalRecordNumber: patientMrn, deletedAt: null },
    });

    if (!patient) {
      return { success: false, messageType: 'ORU', triggerEvent: message.triggerEvent, controlId: message.controlId, ackCode: 'AE', message: `Patient not found: ${patientMrn}` };
    }

    const observations = obxSegments.map((obx) => ({
      code: this.parser.getComponent(obx.fields[2] || '', 1),
      name: this.parser.getComponent(obx.fields[2] || '', 2),
      value: obx.fields[4] || '',
      unit: obx.fields[5] || '',
      range: obx.fields[6] || '',
      flag: obx.fields[7] || 'N',
    }));

    await this.auditService.log({
      action: 'HL7_ORU_PROCESSED',
      entityType: 'LabResult',
      entityId: message.controlId,
      userId,
      details: { patientId: patient.id, observationCount: observations.length },
    });

    return {
      success: true,
      messageType: 'ORU',
      triggerEvent: message.triggerEvent,
      controlId: message.controlId,
      ackCode: 'AA',
      message: `Results received: ${observations.length} observations`,
      data: { patientId: patient.id, observations },
    };
  }

  private async processMfnMessage(message: Hl7Message, userId?: string): Promise<Hl7ProcessingResult> {
    const mfi = this.parser.getSegment(message, 'MFI');
    const mfeSegments = this.parser.getSegments(message, 'MFE');

    const codeSystemName = mfi?.fields[0] || 'UNKNOWN';

    await this.auditService.log({
      action: 'HL7_MFN_PROCESSED',
      entityType: 'Terminology',
      entityId: codeSystemName,
      userId,
      details: { codeSystem: codeSystemName, codeCount: mfeSegments.length },
    });

    return {
      success: true,
      messageType: 'MFN',
      triggerEvent: message.triggerEvent,
      controlId: message.controlId,
      ackCode: 'AA',
      message: `Master file notification received: ${codeSystemName} (${mfeSegments.length} entries)`,
      data: { codeSystem: codeSystemName, entryCount: mfeSegments.length },
    };
  }

  // --- Outbound Message Generation ---

  async generatePatientAdmit(patientId: string, userId?: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const patientInfo: AdtPatientInfo = {
      patientId: patient.medicalRecordNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName || undefined,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender || undefined,
      ssn: patient.ssn || undefined,
      address: patient.address || undefined,
      city: patient.city || undefined,
      state: patient.state || undefined,
      zipCode: patient.zipCode || undefined,
      phone: patient.phone || undefined,
    };

    const visitInfo: AdtVisitInfo = {
      visitNumber: `V-${Date.now()}`,
      patientClass: 'O', // Outpatient
      admitDateTime: new Date().toISOString(),
    };

    const hl7Message = this.parser.generateAdtA01(patientInfo, visitInfo);

    await this.auditService.log({
      action: 'HL7_ADT_A01_GENERATED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { mrn: patient.medicalRecordNumber },
    });

    return hl7Message;
  }

  async generatePatientUpdate(patientId: string, userId?: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const patientInfo: AdtPatientInfo = {
      patientId: patient.medicalRecordNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName || undefined,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender || undefined,
      address: patient.address || undefined,
      city: patient.city || undefined,
      state: patient.state || undefined,
      zipCode: patient.zipCode || undefined,
      phone: patient.phone || undefined,
    };

    const visitInfo: AdtVisitInfo = {
      visitNumber: `V-${patient.medicalRecordNumber}`,
      patientClass: 'O',
    };

    const hl7Message = this.parser.generateAdtA08(patientInfo, visitInfo);

    await this.auditService.log({
      action: 'HL7_ADT_A08_GENERATED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { mrn: patient.medicalRecordNumber },
    });

    return hl7Message;
  }

  async generateOrderMessage(patientId: string, orderCode: string, orderDescription: string, userId?: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const orderId = `ORD-${Date.now()}`;
    const hl7Message = this.parser.generateOrmO01(
      patient.medicalRecordNumber,
      `${patient.lastName}^${patient.firstName}`,
      orderId,
      orderCode,
      orderDescription,
      userId || 'PROVIDER',
    );

    await this.auditService.log({
      action: 'HL7_ORM_GENERATED',
      entityType: 'LabOrder',
      entityId: orderId,
      userId,
      details: { patientId, orderCode, orderDescription },
    });

    return hl7Message;
  }

  async generateResultMessage(patientId: string, orderId: string, observations: { code: string; name: string; value: string; unit: string; range?: string; flag?: string }[], userId?: string): Promise<string> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const hl7Message = this.parser.generateOruR01(
      patient.medicalRecordNumber,
      `${patient.lastName}^${patient.firstName}`,
      orderId,
      observations,
    );

    await this.auditService.log({
      action: 'HL7_ORU_GENERATED',
      entityType: 'LabResult',
      entityId: orderId,
      userId,
      details: { patientId, observationCount: observations.length },
    });

    return hl7Message;
  }

  // --- Utility ---

  private extractPatientInfo(pid: any): AdtPatientInfo {
    const nameField = pid.fields[4] || '';
    const nameComponents = nameField.split('^');
    const addressField = pid.fields[10] || '';
    const addressComponents = addressField.split('^');

    return {
      patientId: pid.fields[2] || '',
      lastName: nameComponents[0] || '',
      firstName: nameComponents[1] || '',
      middleName: nameComponents[2] || undefined,
      dateOfBirth: pid.fields[6] ? this.parseHl7Date(pid.fields[6]) : undefined,
      gender: pid.fields[7] || undefined,
      ssn: pid.fields[18] || undefined,
      address: addressComponents[0] || undefined,
      city: addressComponents[2] || undefined,
      state: addressComponents[3] || undefined,
      zipCode: addressComponents[4] || undefined,
      phone: pid.fields[12] || undefined,
    };
  }

  private parseHl7Date(hl7Date: string): string {
    if (hl7Date.length >= 8) {
      return `${hl7Date.substring(0, 4)}-${hl7Date.substring(4, 6)}-${hl7Date.substring(6, 8)}`;
    }
    return hl7Date;
  }
}
