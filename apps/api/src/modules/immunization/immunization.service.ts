import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
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
  private readonly logger = new Logger(ImmunizationService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };
    const [records, total] = await Promise.all([
      this.prisma.immunization.findMany({ where, skip: query.skip, take: query.limit, orderBy: { administeredAt: 'desc' } }),
      this.prisma.immunization.count({ where }),
    ]);
    return new PaginatedResult(records, total, query.page, query.limit);
  }

  async create(dto: CreateImmunizationDto) {
    const immunization = await this.prisma.immunization.create({
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

    await this.auditService.log({
      action: 'IMMUNIZATION_ADMINISTERED',
      entityType: 'Immunization',
      entityId: immunization.id,
      userId: dto.administeredById,
      details: {
        patientId: dto.patientId,
        vaccineName: dto.vaccineName,
        cvxCode: dto.cvxCode,
        lotNumber: dto.lotNumber,
        doseNumber: dto.doseNumber,
      },
    });

    // Log refusals separately for tracking
    if (dto.status === 'refused' && dto.refusalReason) {
      await this.auditService.log({
        action: 'IMMUNIZATION_REFUSED',
        entityType: 'Immunization',
        entityId: immunization.id,
        userId: dto.administeredById,
        details: {
          patientId: dto.patientId,
          vaccineName: dto.vaccineName,
          refusalReason: dto.refusalReason,
        },
      });
    }

    return immunization;
  }

  async update(id: string, dto: Partial<CreateImmunizationDto>, userId?: string) {
    const record = await this.prisma.immunization.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Immunization record not found');

    const data: any = { ...dto };
    if (dto.administeredAt) data.administeredAt = new Date(dto.administeredAt);

    const updated = await this.prisma.immunization.update({ where: { id }, data });

    await this.auditService.log({
      action: 'IMMUNIZATION_UPDATED',
      entityType: 'Immunization',
      entityId: id,
      userId,
      details: { patientId: record.patientId, vaccineName: record.vaccineName },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const record = await this.prisma.immunization.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Immunization record not found');

    await this.prisma.immunization.delete({ where: { id } });

    await this.auditService.log({
      action: 'IMMUNIZATION_DELETED',
      entityType: 'Immunization',
      entityId: id,
      userId,
      details: { patientId: record.patientId, vaccineName: record.vaccineName },
    });

    return { message: 'Immunization record deleted' };
  }
}
