import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class CarePlanService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, deletedAt: null };
    const [plans, total] = await Promise.all([
      this.prisma.carePlan.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { goals: true },
      }),
      this.prisma.carePlan.count({ where }),
    ]);
    return new PaginatedResult(plans, total, query.page, query.limit);
  }

  async findById(id: string) {
    const plan = await this.prisma.carePlan.findFirst({
      where: { id, deletedAt: null },
      include: { goals: true, patient: { select: { firstName: true, lastName: true } } },
    });
    if (!plan) throw new NotFoundException('Care plan not found');
    return plan;
  }

  async create(dto: any) {
    return this.prisma.carePlan.create({
      data: {
        patientId: dto.patientId,
        title: dto.title,
        description: dto.description,
        status: dto.status || 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdById: dto.createdById,
        notes: dto.notes,
        goals: dto.goals?.length
          ? { create: dto.goals.map((g: any) => ({ title: g.title, description: g.description, targetDate: g.targetDate ? new Date(g.targetDate) : null })) }
          : undefined,
      },
      include: { goals: true },
    });
  }

  async update(id: string, dto: any) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    return this.prisma.carePlan.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
      include: { goals: true },
    });
  }

  async addGoal(planId: string, dto: { title: string; description?: string; targetDate?: string }) {
    return this.prisma.carePlanGoal.create({
      data: {
        carePlanId: planId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  async updateGoal(goalId: string, dto: { status?: string; achievedAt?: string }) {
    return this.prisma.carePlanGoal.update({
      where: { id: goalId },
      data: {
        status: dto.status,
        achievedAt: dto.achievedAt ? new Date(dto.achievedAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');
    return this.prisma.carePlan.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
