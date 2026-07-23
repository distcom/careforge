import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateImmunizationDto {
  patientId: string;
  cvxCode?: string;
  vaccineName: string;
  manufacturer?: string;
  lotNumber?: string;
  doseNumber?: number;
  seriesTotal?: number;
  administrationSite?: string;
  route?: string;
  administeredAt: string;
  administeredById?: string;
  status?: string;
  refusalReason?: string;
  notes?: string;
}

@Injectable()
export class ImmunizationService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };
    const [records, total] = await Promise.all([
      this.prisma.immunization.findMany({ where, skip: query.skip, take: query.limit, orderBy: { administeredAt: 'desc' } }),
      this.prisma.immunization.count({ where }),
    ]);
    return new PaginatedResult(records, total, query.page, query.limit);
  }

  async create(dto: CreateImmunizationDto) {
    return this.prisma.immunization.create({
      data: {
        patientId: dto.patientId,
        cvxCode: dto.cvxCode,
        vaccineName: dto.vaccineName,
        manufacturer: dto.manufacturer,
        lotNumber: dto.lotNumber,
        doseNumber: dto.doseNumber,
        seriesTotal: dto.seriesTotal,
        administrationSite: dto.administrationSite,
        route: dto.route,
        administeredAt: new Date(dto.administeredAt),
        administeredById: dto.administeredById,
        status: dto.status || 'completed',
        refusalReason: dto.refusalReason,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: Partial<CreateImmunizationDto>) {
    const record = await this.prisma.immunization.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Immunization record not found');
    const data: any = { ...dto };
    if (dto.administeredAt) data.administeredAt = new Date(dto.administeredAt);
    return this.prisma.immunization.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.immunization.delete({ where: { id } });
    return { message: 'Immunization record deleted' };
  }
}
