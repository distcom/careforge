import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateEncounterDto, UpdateEncounterDto, SignEncounterDto } from './dto/encounter.dto';

@Injectable()
export class EncounterService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationQuery & { patientId?: string; providerId?: string; status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };

    if (query.patientId) where.patientId = query.patientId;
    if (query.providerId) where.providerId = query.providerId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { chiefComplaint: { contains: query.search, mode: 'insensitive' } },
        { assessment: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [encounters, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
          diagnoses: true,
          procedures: true,
        },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return new PaginatedResult(encounters, total, query.page, query.limit);
  }

  async findById(id: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        facility: { select: { id: true, name: true } },
        diagnoses: true,
        procedures: true,
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 5 },
      },
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  async create(dto: CreateEncounterDto, providerId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    return this.prisma.encounter.create({
      data: {
        patientId: dto.patientId,
        providerId,
        facilityId: dto.facilityId,
        appointmentId: dto.appointmentId,
        type: dto.type || 'OFFICE_VISIT',
        status: 'IN_PROGRESS',
        chiefComplaint: dto.chiefComplaint,
        hpi: dto.hpi,
        ros: dto.ros,
        physicalExam: dto.physicalExam,
        assessment: dto.assessment,
        plan: dto.plan,
        instructions: dto.instructions,
        startedAt: new Date(),
        diagnoses: dto.diagnoses?.length
          ? { create: dto.diagnoses }
          : undefined,
        procedures: dto.procedures?.length
          ? { create: dto.procedures }
          : undefined,
      },
      include: { diagnoses: true, procedures: true },
    });
  }

  async update(id: string, dto: UpdateEncounterDto) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (encounter.status === 'SIGNED') {
      throw new BadRequestException('Cannot modify a signed encounter');
    }

    return this.prisma.encounter.update({
      where: { id },
      data: {
        chiefComplaint: dto.chiefComplaint,
        hpi: dto.hpi,
        ros: dto.ros,
        physicalExam: dto.physicalExam,
        assessment: dto.assessment,
        plan: dto.plan,
        instructions: dto.instructions,
      },
      include: { diagnoses: true, procedures: true },
    });
  }

  async sign(id: string, dto: SignEncounterDto, userId: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (encounter.status === 'SIGNED') {
      throw new BadRequestException('Encounter already signed');
    }

    return this.prisma.encounter.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedById: userId,
        cosignedById: dto.cosignedById,
        cosignedAt: dto.cosignedById ? new Date() : null,
      },
    });
  }

  async addDiagnosis(encounterId: string, dto: { icd10Code: string; description: string; isPrimary?: boolean }) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    return this.prisma.encounterDiagnosis.create({
      data: { encounterId, ...dto },
    });
  }

  async addProcedure(encounterId: string, dto: { cptCode: string; description: string; modifiers?: string; units?: number; fee?: number }) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    return this.prisma.encounterProcedure.create({
      data: { encounterId, ...dto },
    });
  }

  async remove(id: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    return this.prisma.encounter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
