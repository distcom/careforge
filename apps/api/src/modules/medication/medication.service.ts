import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
  notes?: string;
}

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
  async findPrescriptions(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };
    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { prescribedAt: 'desc' },
        include: { provider: { select: { firstName: true, lastName: true, prefix: true } } },
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

  async transmitPrescription(id: string, userId?: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: 'TRANSMITTED', transmittedAt: new Date() },
    });

    await this.auditService.log({
      action: 'PRESCRIPTION_TRANSMITTED',
      entityType: 'Prescription',
      entityId: id,
      userId,
      details: { patientId: prescription.patientId, medicationName: prescription.medicationName },
    });

    return updated;
  }
}
