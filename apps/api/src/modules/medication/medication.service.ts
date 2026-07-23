import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
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
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [medications, total] = await Promise.all([
      this.prisma.medication.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.medication.count({ where }),
    ]);
    return new PaginatedResult(medications, total, query.page, query.limit);
  }

  async create(dto: CreateMedicationDto) {
    return this.prisma.medication.create({
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
  }

  async update(id: string, dto: Partial<CreateMedicationDto> & { status?: string; endDate?: string }) {
    const med = await this.prisma.medication.findFirst({ where: { id, deletedAt: null } });
    if (!med) throw new NotFoundException('Medication not found');
    const data: any = { ...dto };
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.medication.update({ where: { id }, data });
  }

  async discontinue(id: string) {
    return this.prisma.medication.update({
      where: { id },
      data: { status: 'DISCONTINUED', endDate: new Date() },
    });
  }

  async remove(id: string) {
    await this.prisma.medication.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Medication removed' };
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

  async createPrescription(dto: CreatePrescriptionDto) {
    return this.prisma.prescription.create({
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
  }

  async transmitPrescription(id: string) {
    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'TRANSMITTED' },
    });
  }
}
