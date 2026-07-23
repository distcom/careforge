import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class TerminologyService {
  constructor(private prisma: PrismaService) {}

  async getCodeSets(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where: any = { isActive: true };
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [codeSets, total] = await Promise.all([
      this.prisma.codeSet.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { codes: true } } },
      }),
      this.prisma.codeSet.count({ where }),
    ]);
    return new PaginatedResult(codeSets, total, query.page, query.limit);
  }

  async searchCodes(codeSetId: string, query: PaginationQuery & { code?: string }): Promise<PaginatedResult<any>> {
    const where: any = { codeSetId, isActive: true };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.code) where.code = { startsWith: query.code };

    const [codes, total] = await Promise.all([
      this.prisma.codeValue.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.codeValue.count({ where }),
    ]);
    return new PaginatedResult(codes, total, query.page, query.limit);
  }

  async getCodeByCode(codeSetId: string, code: string) {
    const codeValue = await this.prisma.codeValue.findFirst({
      where: { codeSetId, code, isActive: true },
    });
    if (!codeValue) throw new NotFoundException('Code not found');
    return codeValue;
  }

  async createCodeSet(dto: { name: string; description?: string; version?: string }) {
    return this.prisma.codeSet.create({ data: dto });
  }

  async importCodes(codeSetId: string, codes: { code: string; name: string; description?: string; parentCode?: string }[]) {
    const created = await this.prisma.codeValue.createMany({
      data: codes.map((c) => ({ codeSetId, ...c })),
      skipDuplicates: true,
    });
    return { imported: created.count };
  }

  async lookupIcd10(search: string, limit = 20) {
    const codeSet = await this.prisma.codeSet.findFirst({ where: { name: 'ICD-10-CM' } });
    if (!codeSet) return [];

    return this.prisma.codeValue.findMany({
      where: {
        codeSetId: codeSet.id,
        isActive: true,
        OR: [
          { code: { startsWith: search } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { code: 'asc' },
    });
  }

  async lookupCpt(search: string, limit = 20) {
    const codeSet = await this.prisma.codeSet.findFirst({ where: { name: 'CPT' } });
    if (!codeSet) return [];

    return this.prisma.codeValue.findMany({
      where: {
        codeSetId: codeSet.id,
        isActive: true,
        OR: [
          { code: { startsWith: search } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { code: 'asc' },
    });
  }
}
