import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateAllergyDto {
  patientId: string;
  allergen: string;
  allergenType: string;
  snomedCode?: string;
  severity?: string;
  reaction?: string;
  onsetDate?: string;
  notes?: string;
}

@Injectable()
export class AllergyService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, deletedAt: null };
    const [allergies, total] = await Promise.all([
      this.prisma.allergy.findMany({ where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.allergy.count({ where }),
    ]);
    return new PaginatedResult(allergies, total, query.page, query.limit);
  }

  async create(dto: CreateAllergyDto) {
    return this.prisma.allergy.create({
      data: {
        patientId: dto.patientId,
        allergen: dto.allergen,
        allergenType: dto.allergenType,
        snomedCode: dto.snomedCode,
        severity: dto.severity,
        reaction: dto.reaction,
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAllergyDto> & { status?: string; resolvedDate?: string }) {
    const allergy = await this.prisma.allergy.findFirst({ where: { id, deletedAt: null } });
    if (!allergy) throw new NotFoundException('Allergy not found');
    const data: any = { ...dto };
    if (dto.resolvedDate) data.resolvedDate = new Date(dto.resolvedDate);
    return this.prisma.allergy.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.allergy.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Allergy removed' };
  }
}
