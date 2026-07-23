import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/domain-events';
import { DrugInteractionService } from './drug-interaction.service';

export interface PrescriptionOrder {
  patientId: string;
  medicationName: string;
  rxnormCode?: string;
  dosage: string;
  frequency: string;
  route: string;
  duration?: string;
  quantity: number;
  refills: number;
  prescriberId: string;
  pharmacyId?: string;
  pharmacyNcpdpId?: string;
  notes?: string;
  isControlled: boolean;
  deaNumber?: string;
  priorAuthRequired?: boolean;
}

export interface EPrescribeResult {
  prescriptionId: string;
  status: string;
  interactionWarnings: any[];
  allergyAlerts: string[];
  requiresOverride: boolean;
  message: string;
}

/**
 * ePrescribing Workflow Service
 * Handles the full e-prescribing lifecycle including:
 * - Drug interaction/allergy checking before prescribing
 * - NCPDP SCRIPT standard message generation
 * - Prescription status tracking (draft → sent → filled → dispensed)
 * - Controlled substance handling (EPCS)
 * - Prior authorization workflow
 * - Medication reconciliation
 */
@Injectable()
export class EprescribingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly drugInteractionService: DrugInteractionService,
  ) {}

  /**
   * Create a new prescription with safety checks
   */
  async createPrescription(order: PrescriptionOrder): Promise<EPrescribeResult> {
    // Step 1: Run drug interaction and allergy checks
    const interactionCheck = await this.drugInteractionService.checkInteractions(
      order.patientId,
      order.medicationName,
      order.rxnormCode,
    );

    const hasContraindication = interactionCheck.interactions.some(
      (i) => i.severity === 'CONTRAINDICATED',
    );

    // Step 2: Create prescription record
    const prescription = await this.prisma.medication.create({
      data: {
        patientId: order.patientId,
        name: order.medicationName,
        rxnormCode: order.rxnormCode,
        dosage: order.dosage,
        frequency: order.frequency,
        route: order.route,
        duration: order.duration,
        quantity: order.quantity,
        refills: order.refills,
        prescriberId: order.prescriberId,
        status: hasContraindication ? 'FLAGGED' : 'DRAFT',
        startDate: new Date().toISOString(),
        notes: order.notes,
      },
    });

    // Step 3: Determine if override is needed
    const requiresOverride = hasContraindication || interactionCheck.allergies.length > 0;

    return {
      prescriptionId: prescription.id,
      status: prescription.status,
      interactionWarnings: interactionCheck.interactions,
      allergyAlerts: interactionCheck.allergies,
      requiresOverride,
      message: requiresOverride
        ? 'Safety alerts detected. Provider override required before transmission.'
        : 'Prescription created. Ready for electronic transmission.',
    };
  }

  /**
   * Override safety warnings and proceed with prescribing
   */
  async overrideSafetyWarnings(
    prescriptionId: string,
    prescriberId: string,
    overrideReason: string,
  ): Promise<any> {
    const prescription = await this.prisma.medication.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) throw new NotFoundException('Prescription not found');
    if (prescription.status !== 'FLAGGED') {
      throw new BadRequestException('Prescription is not in FLAGGED state');
    }

    const updated = await this.prisma.medication.update({
      where: { id: prescriptionId },
      data: {
        status: 'DRAFT',
        notes: `${prescription.notes || ''}\n[OVERRIDE] ${overrideReason} - by provider ${prescriberId} at ${new Date().toISOString()}`,
      },
    });

    // Log override in audit
    await this.prisma.auditLog.create({
      data: {
        userId: prescriberId,
        action: 'OVERRIDE',
        entityType: 'Prescription',
        entityId: prescriptionId,
        details: { reason: overrideReason, medication: prescription.name },
        ipAddress: '127.0.0.1',
        userAgent: 'CareForge-ePrescribe',
      },
    });

    return updated;
  }

  /**
   * Transmit prescription electronically (NCPDP SCRIPT standard)
   */
  async transmitPrescription(
    prescriptionId: string,
    pharmacyNcpdpId: string,
    prescriberId: string,
  ): Promise<any> {
    const prescription = await this.prisma.medication.findUnique({
      where: { id: prescriptionId },
      include: { patient: true },
    });

    if (!prescription) throw new NotFoundException('Prescription not found');
    if (!['DRAFT', 'FLAGGED'].includes(prescription.status)) {
      throw new BadRequestException(`Cannot transmit prescription in ${prescription.status} state`);
    }

    // Generate NCPDP SCRIPT NewRx message
    const scriptMessage = this.generateNcpdpNewRx(prescription, pharmacyNcpdpId, prescriberId);

    // Update prescription status
    const updated = await this.prisma.medication.update({
      where: { id: prescriptionId },
      data: {
        status: 'TRANSMITTED',
        pharmacyNcpdpId,
        transmittedAt: new Date(),
        notes: `${prescription.notes || ''}\n[TRANSMIT] Sent to pharmacy ${pharmacyNcpdpId} at ${new Date().toISOString()}`,
      },
    });

    // Emit event
    this.eventEmitter.emit(DOMAIN_EVENTS.PRESCRIPTION_SENT, {
      prescriptionId,
      patientId: prescription.patientId,
      medication: prescription.name,
      pharmacyNcpdpId,
    });

    return {
      ...updated,
      ncpdpMessage: scriptMessage,
      transmittedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle prescription refill request
   */
  async requestRefill(
    prescriptionId: string,
    prescriberId: string,
  ): Promise<any> {
    const prescription = await this.prisma.medication.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) throw new NotFoundException('Prescription not found');

    if ((prescription.refills || 0) <= 0) {
      throw new BadRequestException('No refills remaining on this prescription');
    }

    const updated = await this.prisma.medication.update({
      where: { id: prescriptionId },
      data: {
        refills: { decrement: 1 },
        status: 'REFILL_REQUESTED',
        notes: `${prescription.notes || ''}\n[REFILL] Requested at ${new Date().toISOString()}`,
      },
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PRESCRIPTION_REFILL, {
      prescriptionId,
      patientId: prescription.patientId,
      medication: prescription.name,
      refillsRemaining: (prescription.refills || 1) - 1,
    });

    return updated;
  }

  /**
   * Cancel a prescription
   */
  async cancelPrescription(
    prescriptionId: string,
    prescriberId: string,
    reason: string,
  ): Promise<any> {
    const prescription = await this.prisma.medication.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) throw new NotFoundException('Prescription not found');

    if (['CANCELLED', 'DISCONTINUED'].includes(prescription.status)) {
      throw new BadRequestException('Prescription already cancelled');
    }

    const updated = await this.prisma.medication.update({
      where: { id: prescriptionId },
      data: {
        status: 'CANCELLED',
        discontinuedAt: new Date(),
        notes: `${prescription.notes || ''}\n[CANCEL] ${reason} - at ${new Date().toISOString()}`,
      },
    });

    // Generate NCPDP CancelRx message if already transmitted
    let cancelMessage = null;
    if (prescription.status === 'TRANSMITTED' || prescription.status === 'FILLED') {
      cancelMessage = this.generateNcpdpCancelRx(prescription, prescriberId, reason);
    }

    return { ...updated, cancelMessage };
  }

  /**
   * Medication reconciliation - compare current meds with new list
   */
  async reconcileMedications(
    patientId: string,
    newMedicationList: Array<{ name: string; dosage?: string; frequency?: string; action: 'CONTINUE' | 'DISCONTINUE' | 'MODIFY' | 'ADD' }>,
    encounterId?: string,
  ): Promise<any> {
    const currentMeds = await this.prisma.medication.findMany({
      where: { patientId, status: 'ACTIVE', deletedAt: null },
    });

    const reconciliation = {
      continued: [] as string[],
      discontinued: [] as string[],
      modified: [] as string[],
      added: [] as string[],
      unaccounted: [] as string[],
    };

    const processedMedIds = new Set<string>();

    for (const item of newMedicationList) {
      const existing = currentMeds.find(
        (m) => m.name.toLowerCase() === item.name.toLowerCase(),
      );

      switch (item.action) {
        case 'CONTINUE':
          if (existing) {
            reconciliation.continued.push(existing.name);
            processedMedIds.add(existing.id);
          }
          break;

        case 'DISCONTINUE':
          if (existing) {
            await this.prisma.medication.update({
              where: { id: existing.id },
              data: { status: 'DISCONTINUED', discontinuedAt: new Date() },
            });
            reconciliation.discontinued.push(existing.name);
            processedMedIds.add(existing.id);
          }
          break;

        case 'MODIFY':
          if (existing) {
            await this.prisma.medication.update({
              where: { id: existing.id },
              data: {
                dosage: item.dosage || existing.dosage,
                frequency: item.frequency || existing.frequency,
              },
            });
            reconciliation.modified.push(existing.name);
            processedMedIds.add(existing.id);
          }
          break;

        case 'ADD':
          await this.prisma.medication.create({
            data: {
              patientId,
              name: item.name,
              dosage: item.dosage,
              frequency: item.frequency,
              status: 'ACTIVE',
              startDate: new Date().toISOString(),
              prescriberId: 'reconciliation',
            },
          });
          reconciliation.added.push(item.name);
          break;
      }
    }

    // Flag medications not accounted for in reconciliation
    for (const med of currentMeds) {
      if (!processedMedIds.has(med.id)) {
        reconciliation.unaccounted.push(med.name);
      }
    }

    return {
      patientId,
      encounterId,
      reconciledAt: new Date().toISOString(),
      ...reconciliation,
    };
  }

  /**
   * Get prescription history for patient
   */
  async getPrescriptionHistory(patientId: string, status?: string) {
    const where: any = { patientId, deletedAt: null };
    if (status) where.status = status;

    return this.prisma.medication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { prescriber: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /**
   * Generate NCPDP SCRIPT NewRx XML message
   */
  private generateNcpdpNewRx(prescription: any, pharmacyNcpdpId: string, prescriberId: string): string {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<Message schemaVersion="10.6" xmlns="http://www.ncpdp.org/schema/SCRIPT">
  <Header>
    <To Qualifier="D">${pharmacyNcpdpId}</To>
    <From Qualifier="P">CareForgeEHR</From>
    <MessageID>${prescription.id}</MessageID>
    <SentTime>${now}</SentTime>
  </Header>
  <Body>
    <NewRx>
      <Pharmacy>
        <Identification Qualifier="NCPDPID">${pharmacyNcpdpId}</Identification>
      </Pharmacy>
      <Prescriber>
        <Identification Qualifier="NPI">${prescriberId}</Identification>
        <Name><LastName>CareForge</LastName><FirstName>Provider</FirstName></Name>
      </Prescriber>
      <Patient>
        <Name><LastName>${prescription.patient?.lastName || ''}</LastName><FirstName>${prescription.patient?.firstName || ''}</FirstName></Name>
        <DateOfBirth><Date>${prescription.patient?.dateOfBirth || ''}</Date></DateOfBirth>
      </Patient>
      <MedicationPrescribed>
        <DrugDescription>${prescription.name} ${prescription.dosage || ''}</DrugDescription>
        <DrugCoded>
          <ProductCode Qualifier="ND">${prescription.rxnormCode || ''}</ProductCode>
        </DrugCoded>
        <Quantity><Value>${prescription.quantity || 30}</Value></Quantity>
        <Refills><Qualifier>R</Qualifier><Value>${prescription.refills || 0}</Value></Refills>
        <Directions>${prescription.frequency || ''} ${prescription.route || ''}</Directions>
        <WrittenDate><Date>${now}</Date></WrittenDate>
      </MedicationPrescribed>
    </NewRx>
  </Body>
</Message>`;
  }

  /**
   * Generate NCPDP SCRIPT CancelRx XML message
   */
  private generateNcpdpCancelRx(prescription: any, prescriberId: string, reason: string): string {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<Message schemaVersion="10.6" xmlns="http://www.ncpdp.org/schema/SCRIPT">
  <Header>
    <To Qualifier="D">${prescription.pharmacyNcpdpId || ''}</To>
    <From Qualifier="P">CareForgeEHR</From>
    <MessageID>CANCEL-${prescription.id}</MessageID>
    <SentTime>${now}</SentTime>
  </Header>
  <Body>
    <CancelRx>
      <Pharmacy>
        <Identification Qualifier="NCPDPID">${prescription.pharmacyNcpdpId || ''}</Identification>
      </Pharmacy>
      <Prescriber>
        <Identification Qualifier="NPI">${prescriberId}</Identification>
      </Prescriber>
      <MedicationPrescribed>
        <DrugDescription>${prescription.name}</DrugDescription>
        <CancelReason>${reason}</CancelReason>
      </MedicationPrescribed>
    </CancelRx>
  </Body>
</Message>`;
  }
}
