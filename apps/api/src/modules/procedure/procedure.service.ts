import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateProcedureDto {
  patientId: string;
  cptCode?: string;
  name: string;
  description?: string;
  performedAt?: string;
  performedById?: string;
  facility?: string;
  preOpNotes?: string;
  postOpNotes?: string;
  complications?: string;
  anesthesia?: string;
  laterality?: string;
  notes?: string;
}

@Injectable()
export class ProcedureService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, deletedAt: null };
    const [procedures, total] = await Promise.all([
      this.prisma.procedure.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.procedure.count({ where }),
    ]);
    return new PaginatedResult(procedures, total, query.page, query.limit);
  }

  async create(dto: CreateProcedureDto) {
    return this.prisma.procedure.create({
      data: {
        patientId: dto.patientId,
        cptCode: dto.cptCode,
        name: dto.name,
        description: dto.description,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        performedById: dto.performedById,
        facility: dto.facility,
        preOpNotes: dto.preOpNotes,
        postOpNotes: dto.postOpNotes,
        complications: dto.complications,
        anesthesia: dto.anesthesia,
        laterality: dto.laterality,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: Partial<CreateProcedureDto> & { status?: string }) {
    const proc = await this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
    if (!proc) throw new NotFoundException('Procedure not found');
    const data: any = { ...dto };
    if (dto.performedAt) data.performedAt = new Date(dto.performedAt);
    return this.prisma.procedure.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.procedure.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Procedure removed' };
  }
}
