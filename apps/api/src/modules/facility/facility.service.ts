import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class FacilityService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [facilities, total] = await Promise.all([
      this.prisma.facility.findMany({
        where, skip: query.skip, take: query.limit, orderBy: { name: 'asc' },
        include: { _count: { select: { users: true, patients: true } } },
      }),
      this.prisma.facility.count({ where }),
    ]);
    return new PaginatedResult(facilities, total, query.page, query.limit);
  }

  async findById(id: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id, deletedAt: null },
      include: { resources: true, _count: { select: { users: true, patients: true, appointments: true } } },
    });
    if (!facility) throw new NotFoundException('Facility not found');
    return facility;
  }

  async create(dto: any) {
    return this.prisma.facility.create({ data: dto });
  }

  async update(id: string, dto: any) {
    const facility = await this.prisma.facility.findFirst({ where: { id, deletedAt: null } });
    if (!facility) throw new NotFoundException('Facility not found');
    return this.prisma.facility.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.facility.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Facility deactivated' };
  }
}
