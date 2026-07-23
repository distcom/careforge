import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
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
  constructor(private prisma: PrismaService) {}

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

  async create(dto: CreateConditionDto) {
    return this.prisma.condition.create({
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
  }

  async update(id: string, dto: UpdateConditionDto) {
    const condition = await this.prisma.condition.findFirst({ where: { id, deletedAt: null } });
    if (!condition) throw new NotFoundException('Condition not found');

    const data: any = { ...dto };
    if (dto.onsetDate) data.onsetDate = new Date(dto.onsetDate);
    if (dto.resolvedDate) data.resolvedDate = new Date(dto.resolvedDate);

    return this.prisma.condition.update({ where: { id }, data });
  }

  async resolve(id: string) {
    return this.prisma.condition.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedDate: new Date() },
    });
  }

  async remove(id: string) {
    await this.prisma.condition.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Condition removed' };
  }
}
