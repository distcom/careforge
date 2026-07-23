import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async findCompanies(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where: any = { isActive: true };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    const [companies, total] = await Promise.all([
      this.prisma.insuranceCompany.findMany({
        where, skip: query.skip, take: query.limit, orderBy: { name: 'asc' },
        include: { plans: true },
      }),
      this.prisma.insuranceCompany.count({ where }),
    ]);
    return new PaginatedResult(companies, total, query.page, query.limit);
  }

  async createCompany(dto: any) {
    return this.prisma.insuranceCompany.create({ data: dto });
  }

  async getPatientInsurance(patientId: string) {
    return this.prisma.patientInsurance.findMany({
      where: { patientId, isActive: true },
      orderBy: { priority: 'asc' },
      include: { insurancePlan: { include: { company: true } } },
    });
  }

  async addPatientInsurance(patientId: string, dto: any) {
    return this.prisma.patientInsurance.create({
      data: { ...dto, patientId },
      include: { insurancePlan: { include: { company: true } } },
    });
  }

  async removePatientInsurance(id: string) {
    await this.prisma.patientInsurance.update({ where: { id }, data: { isActive: false } });
    return { message: 'Insurance removed' };
  }
}
