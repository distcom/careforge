import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateConditionDto {
  patientId: string;
  icd10Code?: string;
  snomedCode?: string;
  name: string;
  description?: string;
  status?: string;
  severity?: string;
  laterality?: string;
  onsetDate?: string;
  notes?: string;
}

export interface UpdateConditionDto {
  name?: string;
  description?: string;
  status?: string;
  severity?: string;
  laterality?: string;
  onsetDate?: string;
  resolvedDate?: string;
  notes?: string;
}

@Injectable()
export class ConditionService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [conditions, total] = await Promise.all([
      this.prisma.condition.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.condition.count({ where }),
    ]);

    return new PaginatedResult(conditions, total, query.page, query.limit);
  }

  async create(dto: CreateConditionDto, userId?: string) {
    const condition = await this.prisma.condition.create({
      data: {
        patientId: dto.patientId,
        icd10Code: dto.icd10Code,
        snomedCode: dto.snomedCode,
        name: dto.name,
        description: dto.description,
        status: (dto.status as any) || 'ACTIVE',
        severity: dto.severity,
        laterality: dto.laterality,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'CONDITION_ADDED',
      entityType: 'Condition',
      entityId: condition.id,
      userId,
      details: { patientId: dto.patientId, name: dto.name, icd10Code: dto.icd10Code },
    });

    return condition;
  }

  async update(id: string, dto: UpdateConditionDto, userId?: string) {
    const condition = await this.prisma.condition.findFirst({ where: { id, deletedAt: null } });
    if (!condition) throw new NotFoundException('Condition not found');

    const data: any = { ...dto };
    if (dto.onsetDate) data.onsetDate = new Date(dto.onsetDate);
    if (dto.resolvedDate) data.resolvedDate = new Date(dto.resolvedDate);

    const updated = await this.prisma.condition.update({ where: { id }, data });

    await this.auditService.log({
      action: 'CONDITION_UPDATED',
      entityType: 'Condition',
      entityId: id,
      userId,
      details: { patientId: condition.patientId },
    });

    return updated;
  }

  async resolve(id: string, userId?: string) {
    const condition = await this.prisma.condition.findFirst({ where: { id, deletedAt: null } });
    if (!condition) throw new NotFoundException('Condition not found');

    const updated = await this.prisma.condition.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedDate: new Date() },
    });

    await this.auditService.log({
      action: 'CONDITION_RESOLVED',
      entityType: 'Condition',
      entityId: id,
      userId,
      details: { patientId: condition.patientId, name: condition.name },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const condition = await this.prisma.condition.findFirst({ where: { id, deletedAt: null } });
    if (!condition) throw new NotFoundException('Condition not found');

    await this.prisma.condition.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      action: 'CONDITION_REMOVED',
      entityType: 'Condition',
      entityId: id,
      userId,
      details: { patientId: condition.patientId, name: condition.name },
    });

    return { message: 'Condition removed' };
  }
}
