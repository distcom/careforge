import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/domain-events';

/**
 * HL7 v2.x Message Handling Service
 * Supports ORM (Order Entry) and ORU (Observation Result) message types
 * Also handles ADT (Admit/Discharge/Transfer) for patient demographics
 */

export interface HL7Message {
  messageType: string;
  triggerEvent: string;
  controlId: string;
  segments: Map<string, string[][]>;
  raw: string;
}

export interface HL7ParseResult {
  success: boolean;
  message?: HL7Message;
  error?: string;
}

export interface ORUResult {
  orderId: string;
  observations: Array<{
    identifier: string;
    value: string;
    units: string;
    referenceRange: string;
    abnormalFlag: string;
    status: string;
    dateTime: string;
  }>;
}

@Injectable()
export class Hl7Service {
  private readonly logger = new Logger(Hl7Service.name);
  private readonly FIELD_SEP = '|';
  private readonly COMPONENT_SEP = '^';
  private readonly SUBCOMPONENT_SEP = '&';
  private readonly REPETITION_SEP = '~';
  private readonly ESCAPE_CHAR = '\\';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Parse raw HL7 v2.x message into structured format
   */
  parseMessage(raw: string): HL7ParseResult {
    try {
      const lines = raw.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return { success: false, error: 'Empty message' };
      }

      const mshLine = lines[0];
      if (!mshLine.startsWith('MSH')) {
        return { success: false, error: 'Message must start with MSH segment' };
      }

      const mshFields = mshLine.split(this.FIELD_SEP);
      const messageType = mshFields[8]?.split(this.COMPONENT_SEP)[0] || '';
      const triggerEvent = mshFields[8]?.split(this.COMPONENT_SEP)[1] || '';
      const controlId = mshFields[9] || `CTRL-${Date.now()}`;

      const segments = new Map<string, string[][]>();
      for (const line of lines) {
        const segType = line.substring(0, 3);
        const fields = line.split(this.FIELD_SEP).map((f) => f.split(this.COMPONENT_SEP));
        if (!segments.has(segType)) {
          segments.set(segType, []);
        }
        segments.get(segType)!.push(fields);
      }

      return {
        success: true,
        message: { messageType, triggerEvent, controlId, segments, raw },
      };
    } catch (error) {
      return { success: false, error: `Parse error: ${error.message}` };
    }
  }

  /**
   * Process an incoming HL7 message based on type
   */
  async processMessage(raw: string): Promise<any> {
    const parsed = this.parseMessage(raw);
    if (!parsed.success || !parsed.message) {
      throw new BadRequestException(`Invalid HL7 message: ${parsed.error}`);
    }

    const { messageType, triggerEvent } = parsed.message;
    this.logger.log(`Processing HL7 ${messageType}^${triggerEvent}`);

    switch (messageType) {
      case 'ORM':
        return this.handleORM(parsed.message);
      case 'ORU':
        return this.handleORU(parsed.message);
      case 'ADT':
        return this.handleADT(parsed.message);
      case 'ACK':
        return this.generateACK(parsed.message, 'AA', 'Message acknowledged');
      default:
        this.logger.warn(`Unhandled message type: ${messageType}^${triggerEvent}`);
        return this.generateACK(parsed.message, 'AR', `Unsupported message type: ${messageType}`);
    }
  }

  /**
   * Handle ORM - Order Entry Message
   * Used for lab orders, medication orders, procedure orders
   */
  private async handleORM(message: HL7Message): Promise<any> {
    const orc = message.segments.get('ORC')?.[0];
    const obr = message.segments.get('OBR')?.[0];
    const pid = message.segments.get('PID')?.[0];

    if (!pid || !obr) {
      return this.generateACK(message, 'AE', 'Missing required PID or OBR segment');
    }

    // Extract patient identifier
    const patientId = this.extractField(pid, 3, 0);
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { medicalRecordNumber: patientId },
          { id: patientId },
        ],
        deletedAt: null,
      },
    });

    if (!patient) {
      return this.generateACK(message, 'AE', `Patient not found: ${patientId}`);
    }

    // Extract order details from OBR
    const universalServiceId = this.extractField(obr, 4, 0);
    const serviceText = this.extractField(obr, 4, 1);
    const orderControl = orc ? this.extractField(orc, 1, 0) : 'NW';
    const placerOrderNumber = orc ? this.extractField(orc, 2, 0) : '';
    const fillerOrderNumber = orc ? this.extractField(orc, 3, 0) : '';
    const priority = this.extractField(obr, 25, 0) || 'R';
    const requestedDateTime = this.extractField(obr, 7, 0);

    // Determine order type based on universal service ID
    const orderType = this.classifyOrderType(universalServiceId, serviceText);

    if (orderType === 'LAB') {
      // Create lab order
      const labOrder = await this.prisma.labOrder.create({
        data: {
          patientId: patient.id,
          testCode: universalServiceId,
          testName: serviceText || universalServiceId,
          status: orderControl === 'NW' ? 'ORDERED' : 'UPDATED',
          priority: priority === 'S' ? 'STAT' : priority === 'A' ? 'ASAP' : 'ROUTINE',
          orderedAt: requestedDateTime ? this.parseHL7Date(requestedDateTime) : new Date(),
          externalOrderId: fillerOrderNumber || placerOrderNumber,
          notes: `HL7 ORM order: ${placerOrderNumber}`,
        },
      });

      this.eventEmitter.emit(DOMAIN_EVENTS.LAB_ORDERED, {
        labOrderId: labOrder.id,
        patientId: patient.id,
        testCode: universalServiceId,
      });

      return this.generateACK(message, 'AA', `Lab order created: ${labOrder.id}`);
    }

    return this.generateACK(message, 'AA', `Order processed: ${universalServiceId}`);
  }

  /**
   * Handle ORU - Observation Result Message
   * Used for lab results, vital signs observations
   */
  private async handleORU(message: HL7Message): Promise<any> {
    const pid = message.segments.get('PID')?.[0];
    const obr = message.segments.get('OBR')?.[0];
    const obxSegments = message.segments.get('OBX') || [];

    if (!pid || !obr) {
      return this.generateACK(message, 'AE', 'Missing required PID or OBR segment');
    }

    const patientId = this.extractField(pid, 3, 0);
    const patient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { medicalRecordNumber: patientId },
          { id: patientId },
        ],
        deletedAt: null,
      },
    });

    if (!patient) {
      return this.generateACK(message, 'AE', `Patient not found: ${patientId}`);
    }

    const testCode = this.extractField(obr, 4, 0);
    const testName = this.extractField(obr, 4, 1);
    const resultStatus = this.extractField(obr, 25, 0);
    const observationDateTime = this.extractField(obr, 7, 0);

    // Parse OBX segments into structured observations
    const observations: ORUResult['observations'] = obxSegments.map((obx) => ({
      identifier: this.extractField(obx, 3, 0),
      value: this.extractField(obx, 5, 0),
      units: this.extractField(obx, 6, 0),
      referenceRange: this.extractField(obx, 7, 0),
      abnormalFlag: this.extractField(obx, 8, 0),
      status: this.extractField(obx, 11, 0),
      dateTime: this.extractField(obx, 14, 0),
    }));

    // Find matching lab order
    const labOrder = await this.prisma.labOrder.findFirst({
      where: {
        patientId: patient.id,
        testCode,
        status: { in: ['ORDERED', 'COLLECTED', 'PROCESSING'] },
      },
      orderBy: { orderedAt: 'desc' },
    });

    if (labOrder) {
      // Update lab order with results
      const isFinal = resultStatus === 'F' || resultStatus === 'C';
      const hasAbnormal = observations.some((o) => ['A', 'H', 'L', 'HH', 'LL', 'C'].includes(o.abnormalFlag));

      await this.prisma.labOrder.update({
        where: { id: labOrder.id },
        data: {
          status: isFinal ? 'RESULTED' : 'PARTIAL',
          resultedAt: observationDateTime ? this.parseHL7Date(observationDateTime) : new Date(),
          results: observations as any,
          isAbnormal: hasAbnormal,
        },
      });

      // Emit event for critical/abnormal results
      if (hasAbnormal && isFinal) {
        this.eventEmitter.emit(DOMAIN_EVENTS.LAB_RESULT_CRITICAL, {
          labOrderId: labOrder.id,
          patientId: patient.id,
          testCode,
          testName,
          observations: observations.filter((o) => ['H', 'HH', 'L', 'LL', 'C'].includes(o.abnormalFlag)),
        });
      }

      this.eventEmitter.emit(DOMAIN_EVENTS.LAB_RESULT_RECEIVED, {
        labOrderId: labOrder.id,
        patientId: patient.id,
        testCode,
        status: isFinal ? 'FINAL' : 'PRELIMINARY',
      });
    }

    return this.generateACK(message, 'AA', `Results processed for ${testName || testCode}`);
  }

  /**
   * Handle ADT - Admit/Discharge/Transfer
   * A01=Admit, A08=Update, A40=Merge
   */
  private async handleADT(message: HL7Message): Promise<any> {
    const pid = message.segments.get('PID')?.[0];
    const pv1 = message.segments.get('PV1')?.[0];

    if (!pid) {
      return this.generateACK(message, 'AE', 'Missing PID segment');
    }

    const patientId = this.extractField(pid, 3, 0);
    const lastName = this.extractField(pid, 5, 0);
    const firstName = this.extractField(pid, 5, 1);
    const dob = this.extractField(pid, 7, 0);
    const gender = this.extractField(pid, 8, 0);
    const ssn = this.extractField(pid, 19, 0);
    const address = this.extractField(pid, 11, 0);
    const city = this.extractField(pid, 11, 2);
    const state = this.extractField(pid, 11, 3);
    const zip = this.extractField(pid, 11, 4);
    const phone = this.extractField(pid, 13, 0);

    const existing = await this.prisma.patient.findFirst({
      where: { OR: [{ medicalRecordNumber: patientId }, { ssn: ssn || undefined }] },
    });

    const genderMap: Record<string, string> = { M: 'MALE', F: 'FEMALE', O: 'OTHER', U: 'UNKNOWN' };

    if (existing) {
      // Update existing patient demographics
      await this.prisma.patient.update({
        where: { id: existing.id },
        data: {
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          phone: phone || existing.phone,
          address: address || existing.address,
          city: city || existing.city,
          state: state || existing.state,
          zipCode: zip || existing.zipCode,
        },
      });
      return this.generateACK(message, 'AA', `Patient updated: ${existing.id}`);
    }

    // Create new patient from ADT
    const newPatient = await this.prisma.patient.create({
      data: {
        firstName: firstName || 'Unknown',
        lastName: lastName || 'Unknown',
        dateOfBirth: dob ? this.parseHL7Date(dob).toISOString() : new Date().toISOString(),
        gender: genderMap[gender] || 'UNKNOWN',
        ssn: ssn || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zip || null,
        medicalRecordNumber: patientId,
        status: 'ACTIVE',
      },
    });

    return this.generateACK(message, 'AA', `Patient created: ${newPatient.id}`);
  }

  /**
   * Generate HL7 ORM^O01 message for outgoing lab orders
   */
  generateORMMessage(order: {
    patientId: string;
    patientName: string;
    patientDob: string;
    patientGender: string;
    testCode: string;
    testName: string;
    priority: string;
    orderId: string;
    providerName: string;
  }): string {
    const now = this.formatHL7Date(new Date());
    const genderMap: Record<string, string> = { MALE: 'M', FEMALE: 'F', OTHER: 'O', UNKNOWN: 'U' };

    return [
      `MSH|^~\\&|CareForge|CareForgeEHR|LabSystem|Lab|${now}||ORM^O01|${order.orderId}|P|2.5.1`,
      `PID|1||${order.patientId}||${order.patientName.split(' ')[1] || ''}^${order.patientName.split(' ')[0] || ''}||${this.formatHL7Date(new Date(order.patientDob))}|${genderMap[order.patientGender] || 'U'}`,
      `ORC|NW|${order.orderId}|||||${order.priority === 'STAT' ? 'S' : 'R'}`,
      `OBR|1|${order.orderId}||${order.testCode}^${order.testName}|||||||${now}||||||${order.providerName}`,
    ].join('\r');
  }

  /**
   * Generate ACK response
   */
  private generateACK(original: HL7Message, code: string, text: string): any {
    const now = this.formatHL7Date(new Date());
    const ackMessage = [
      `MSH|^~\\&|CareForge|CareForgeEHR||||${now}||ACK|${original.controlId}|P|2.5.1`,
      `MSA|${code}|${original.controlId}|${text}`,
    ].join('\r');

    return {
      acknowledgmentCode: code,
      text,
      raw: ackMessage,
      processedAt: new Date().toISOString(),
    };
  }

  // --- Utility Methods ---

  private extractField(fields: string[][], index: number, component: number): string {
    if (!fields || fields.length <= index) return '';
    const field = fields[index];
    if (!field || field.length <= component) return '';
    return field[component]?.trim() || '';
  }

  private classifyOrderType(serviceId: string, serviceText: string): string {
    const labPatterns = ['CBC', 'BMP', 'CMP', 'LIPID', 'TSH', 'HBA1C', 'UA', 'PT', 'INR', 'LFT', 'LOINC'];
    const text = `${serviceId} ${serviceText}`.toUpperCase();
    if (labPatterns.some((p) => text.includes(p))) return 'LAB';
    if (text.includes('RAD') || text.includes('XRAY') || text.includes('CT') || text.includes('MRI')) return 'IMAGING';
    return 'LAB'; // Default to lab
  }

  private parseHL7Date(hl7Date: string): Date {
    if (!hl7Date || hl7Date.length < 8) return new Date();
    const year = parseInt(hl7Date.substring(0, 4));
    const month = parseInt(hl7Date.substring(4, 6)) - 1;
    const day = parseInt(hl7Date.substring(6, 8));
    const hour = hl7Date.length >= 10 ? parseInt(hl7Date.substring(8, 10)) : 0;
    const min = hl7Date.length >= 12 ? parseInt(hl7Date.substring(10, 12)) : 0;
    return new Date(year, month, day, hour, min);
  }

  private formatHL7Date(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  }
}
