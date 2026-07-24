import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateMedicationDto {
  patientId: string;
  rxnormCode?: string;
  ndcCode?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  prescribedById?: string;
  notes?: string;
}

export interface CreatePrescriptionDto {
  patientId: string;
  providerId: string;
  medicationName: string;
  rxnormCode?: string;
  ndcCode?: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  quantity?: string;
  refills?: number;
  instructions?: string;
  deaSchedule?: string;
  pharmacyName?: string;
  pharmacyPhone?: string;
  pharmacyNcpdpId?: string;
  pharmacyNpi?: string;
  pharmacyAddress?: string;
  notes?: string;
}

export interface SignPrescriptionDto {
  electronicSignature: string;
}

export interface TransmitPrescriptionDto {
  transmissionMethod: 'ELECTRONIC' | 'FAX' | 'PHONE' | 'PRINTED';
}

export interface CancelPrescriptionDto {
  reason: string;
}

export interface RenewPrescriptionDto {
  refills?: number;
  quantity?: string;
  notes?: string;
}

export interface RecordFillDto {
  filledPharmacy: string;
  dispensedQuantity: string;
}

export interface PdmpCheckDto {
  findings?: string;
}

export interface FormularyCheckDto {
  status: 'COVERED' | 'NOT_COVERED' | 'PRIOR_AUTH_REQUIRED';
  notes?: string;
}

const PRESCRIPTION_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SIGNED', 'CANCELLED'],
  SIGNED: ['TRANSMITTED', 'CANCELLED'],
  TRANSMITTED: ['FILLED', 'CANCELLED'],
  FILLED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class MedicationService {
  private readonly logger = new Logger(MedicationService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [medications, total] = await Promise.all([
      this.prisma.medication.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.medication.count({ where }),
    ]);
    return new PaginatedResult(medications, total, query.page, query.limit);
  }

  async create(dto: CreateMedicationDto, userId?: string) {
    const medication = await this.prisma.medication.create({
      data: {
        patientId: dto.patientId,
        rxnormCode: dto.rxnormCode,
        ndcCode: dto.ndcCode,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        prescribedById: dto.prescribedById,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'MEDICATION_ADDED',
      entityType: 'Medication',
      entityId: medication.id,
      userId,
      details: { patientId: dto.patientId, name: dto.name, dosage: dto.dosage },
    });

    return medication;
  }

  async update(id: string, dto: Partial<CreateMedicationDto> & { status?: string; endDate?: string }, userId?: string) {
    const med = await this.prisma.medication.findFirst({ where: { id, deletedAt: null } });
    if (!med) throw new NotFoundException('Medication not found');

    const data: any = { ...dto };
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.medication.update({ where: { id }, data });

    await this.auditService.log({
      action: 'MEDICATION_UPDATED',
      entityType: 'Medication',
      entityId: id,
      userId,
      details: { patientId: med.patientId, name: med.name },
    });

    return updated;
  }

  async discontinue(id: string, reason?: string, userId?: string) {
    const med = await this.prisma.medication.findFirst({ where: { id, deletedAt: null } });
    if (!med) throw new NotFoundException('Medication not found');

    const updated = await this.prisma.medication.update({
      where: { id },
      data: { status: 'DISCONTINUED', endDate: new Date(), discontinuedAt: new Date() },
    });

    await this.auditService.log({
      action: 'MEDICATION_DISCONTINUED',
      entityType: 'Medication',
      entityId: id,
      userId,
      details: { patientId: med.patientId, name: med.name, reason },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const med = await this.prisma.medication.findFirst({ where: { id, deletedAt: null } });
    if (!med) throw new NotFoundException('Medication not found');

    await this.prisma.medication.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      action: 'MEDICATION_REMOVED',
      entityType: 'Medication',
      entityId: id,
      userId,
      details: { patientId: med.patientId, name: med.name },
    });

    return { message: 'Medication removed' };
  }

  // Medication Reconciliation
  async reconcile(patientId: string, medications: { name: string; dosage?: string; frequency?: string; source: string }[], userId?: string) {
    const results = [];
    for (const med of medications) {
      const existing = await this.prisma.medication.findFirst({
        where: { patientId, name: { contains: med.name, mode: 'insensitive' }, status: 'ACTIVE', deletedAt: null },
      });

      if (!existing) {
        const created = await this.prisma.medication.create({
          data: {
            patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            status: 'ACTIVE',
            startDate: new Date(),
            notes: `Reconciled from ${med.source}`,
          },
        });
        results.push({ action: 'ADDED', medication: created });
      } else {
        results.push({ action: 'EXISTING', medication: existing });
      }
    }

    await this.auditService.log({
      action: 'MEDICATION_RECONCILIATION',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { medicationCount: medications.length, results: results.map(r => r.action) },
    });

    return results;
  }

  // Prescriptions
  async findPrescriptions(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;
    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { prescribedAt: 'desc' },
        include: {
          provider: { select: { firstName: true, lastName: true, prefix: true } },
          signedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);
    return new PaginatedResult(prescriptions, total, query.page, query.limit);
  }

  async createPrescription(dto: CreatePrescriptionDto, userId?: string) {
    const prescription = await this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        medicationName: dto.medicationName,
        rxnormCode: dto.rxnormCode,
        ndcCode: dto.ndcCode,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        duration: dto.duration,
        quantity: dto.quantity,
        refills: dto.refills || 0,
        instructions: dto.instructions,
        deaSchedule: dto.deaSchedule,
        pharmacyName: dto.pharmacyName,
        pharmacyPhone: dto.pharmacyPhone,
        pharmacyNcpdpId: dto.pharmacyNcpdpId,
        pharmacyNpi: dto.pharmacyNpi,
        pharmacyAddress: dto.pharmacyAddress,
        notes: dto.notes,
        status: 'DRAFT',
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_CREATED',
      entityType: 'Prescription',
      entityId: prescription.id,
      userId,
      details: {
        patientId: dto.patientId,
        medicationName: dto.medicationName,
        deaSchedule: dto.deaSchedule,
      },
    });

    // Log controlled substance prescriptions
    if (dto.deaSchedule && ['II', 'III', 'IV', 'V'].includes(dto.deaSchedule)) {
      this.logger.warn(`Controlled substance prescription: ${dto.medicationName} (Schedule ${dto.deaSchedule}) for patient ${dto.patientId}`);
      await this.auditService.log({
        action: 'CONTROLLED_SUBSTANCE_PRESCRIBED',
        entityType: 'Prescription',
        entityId: prescription.id,
        userId,
        details: {
          patientId: dto.patientId,
          medicationName: dto.medicationName,
          deaSchedule: dto.deaSchedule,
        },
      });
    }

    return prescription;
  }

  async signPrescription(id: string, dto: SignPrescriptionDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status !== 'DRAFT') {
      throw new BadRequestException('Prescription must be in DRAFT status to sign');
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedById: userId,
        signedAt: new Date(),
        electronicSignature: dto.electronicSignature,
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_SIGNED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: { patientId: prescription.patientId, medicationName: prescription.medicationName },
    });

    return updated;
  }

  async transmitPrescription(id: string, dto: TransmitPrescriptionDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status !== 'SIGNED') {
      throw new BadRequestException('Prescription must be SIGNED before transmission');
    }

    // Generate NCPDP message ID for electronic transmission
    const ncpdpMessageId = dto.transmissionMethod === 'ELECTRONIC'
      ? `NCPDP_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : null;

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'TRANSMITTED',
        transmissionMethod: dto.transmissionMethod,
        transmittedAt: new Date(),
        ncpdpMessageId,
        ncpdpStatus: dto.transmissionMethod === 'ELECTRONIC' ? 'QUEUED' : null,
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_TRANSMITTED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: {
        patientId: prescription.patientId,
        medicationName: prescription.medicationName,
        transmissionMethod: dto.transmissionMethod,
        ncpdpMessageId,
      },
    });

    return updated;
  }

  async cancelPrescription(id: string, dto: CancelPrescriptionDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const allowedTransitions = PRESCRIPTION_STATUS_TRANSITIONS[prescription.status] || [];
    if (!allowedTransitions.includes('CANCELLED')) {
      throw new BadRequestException(`Cannot cancel prescription in ${prescription.status} status`);
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelReason: dto.reason,
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_CANCELLED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: {
        patientId: prescription.patientId,
        medicationName: prescription.medicationName,
        reason: dto.reason,
      },
    });

    return updated;
  }

  async renewPrescription(id: string, dto: RenewPrescriptionDto, userId?: string) {
    const original = await this.prisma.prescription.findUnique({ where: { id } });
    if (!original) throw new NotFoundException('Prescription not found');

    if (!['COMPLETED', 'FILLED'].includes(original.status)) {
      throw new BadRequestException('Can only renew completed or filled prescriptions');
    }

    // Create new prescription as renewal
    const renewal = await this.prisma.prescription.create({
      data: {
        patientId: original.patientId,
        providerId: original.providerId,
        medicationName: original.medicationName,
        rxnormCode: original.rxnormCode,
        ndcCode: original.ndcCode,
        dosage: original.dosage,
        frequency: original.frequency,
        route: original.route,
        duration: original.duration,
        quantity: dto.quantity || original.quantity,
        refills: dto.refills ?? original.refills,
        instructions: original.instructions,
        deaSchedule: original.deaSchedule,
        pharmacyName: original.pharmacyName,
        pharmacyPhone: original.pharmacyPhone,
        pharmacyNcpdpId: original.pharmacyNcpdpId,
        pharmacyNpi: original.pharmacyNpi,
        pharmacyAddress: original.pharmacyAddress,
        notes: dto.notes || `Renewal of prescription ${original.id}`,
        status: 'DRAFT',
        renewalOfId: original.id,
        renewalCount: original.renewalCount + 1,
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_RENEWED',
      entityType: 'Prescription',
      entityId: renewal.id,
      userId,
      details: {
        patientId: original.patientId,
        medicationName: original.medicationName,
        originalPrescriptionId: original.id,
        renewalCount: renewal.renewalCount,
      },
    });

    return renewal;
  }

  async recordFill(id: string, dto: RecordFillDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status !== 'TRANSMITTED') {
      throw new BadRequestException('Prescription must be TRANSMITTED to record fill');
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'FILLED',
        filledAt: new Date(),
        filledPharmacy: dto.filledPharmacy,
        dispensedQuantity: dto.dispensedQuantity,
        refillsUsed: prescription.refillsUsed + 1,
      },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_FILLED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: {
        patientId: prescription.patientId,
        medicationName: prescription.medicationName,
        filledPharmacy: dto.filledPharmacy,
        dispensedQuantity: dto.dispensedQuantity,
      },
    });

    return updated;
  }

  async completePrescription(id: string, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.status !== 'FILLED') {
      throw new BadRequestException('Prescription must be FILLED to complete');
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_COMPLETED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: { patientId: prescription.patientId, medicationName: prescription.medicationName },
    });

    return updated;
  }

  async checkPdmp(id: string, dto: PdmpCheckDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        pdmpChecked: true,
        pdmpCheckedAt: new Date(),
        pdmpCheckedById: userId,
        pdmpFindings: dto.findings,
      },
    });

    await this.auditService.log({
      action: 'PDMP_CHECK_PERFORMED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: {
        patientId: prescription.patientId,
        medicationName: prescription.medicationName,
        findings: dto.findings,
      },
    });

    return updated;
  }

  async checkFormulary(id: string, dto: FormularyCheckDto, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: {
        formularyChecked: true,
        formularyStatus: dto.status,
        formularyNotes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'FORMULARY_CHECK_PERFORMED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: {
        patientId: prescription.patientId,
        medicationName: prescription.medicationName,
        formularyStatus: dto.status,
      },
    });

    return updated;
  }

  async getPendingPrescriptions(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { status: { in: ['DRAFT', 'SIGNED'] } };
    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'asc' },
        include: {
          patient: { select: { firstName: true, lastName: true, dateOfBirth: true } },
          provider: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);
    return new PaginatedResult(prescriptions, total, query.page, query.limit);
  }

  async getControlledSubstancePrescriptions(patientId: string, userId?: string) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        deaSchedule: { in: ['II', 'III', 'IV', 'V'] },
        status: { not: 'CANCELLED' },
      },
      orderBy: { prescribedAt: 'desc' },
    });

    await this.auditService.log({
      action: 'CONTROLLED_SUBSTANCE_REPORT',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { prescriptionCount: prescriptions.length },
    });

    return prescriptions;
  }
}
