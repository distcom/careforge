import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateCarePlanDto {
  patientId: string;
  title: string;
  description?: string;
  planType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  reviewDate?: string;
  createdById?: string;
  notes?: string;
  goals?: Array<{ title: string; description?: string; targetDate?: string; priority?: string }>;
}

export interface CreateInterventionDto {
  title: string;
  description?: string;
  interventionType?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  assignedToId?: string;
}

export interface CreateTeamMemberDto {
  userId?: string;
  name?: string;
  role: string;
  responsibilities?: string;
}

@Injectable()
export class CarePlanService {
  private readonly logger = new Logger(CarePlanService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [plans, total] = await Promise.all([
      this.prisma.carePlan.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          goals: true,
          interventions: { where: { status: 'ACTIVE' } },
          teamMembers: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.carePlan.count({ where }),
    ]);
    return new PaginatedResult(plans, total, query.page, query.limit);
  }

  async findById(id: string) {
    const plan = await this.prisma.carePlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        goals: { orderBy: { createdAt: 'asc' } },
        interventions: { orderBy: { createdAt: 'asc' } },
        teamMembers: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!plan) throw new NotFoundException('Care plan not found');
    return plan;
  }

  async create(dto: CreateCarePlanDto, userId?: string) {
    const plan = await this.prisma.carePlan.create({
      data: {
        patientId: dto.patientId,
        title: dto.title,
        description: dto.description,
        planType: dto.planType,
        status: dto.status || 'ACTIVE',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        createdById: dto.createdById || userId,
        notes: dto.notes,
        goals: dto.goals?.length
          ? {
              create: dto.goals.map((g) => ({
                title: g.title,
                description: g.description,
                targetDate: g.targetDate ? new Date(g.targetDate) : null,
                priority: g.priority || 'MEDIUM',
              })),
            }
          : undefined,
      },
      include: { goals: true },
    });

    await this.auditService.log({
      action: 'CARE_PLAN_CREATED',
      entityType: 'CarePlan',
      entityId: plan.id,
      userId: dto.createdById || userId,
      details: {
        patientId: dto.patientId,
        title: dto.title,
        planType: dto.planType,
        goalCount: dto.goals?.length || 0,
      },
    });

    return plan;
  }

  async update(id: string, dto: Partial<CreateCarePlanDto>, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    const updated = await this.prisma.carePlan.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        planType: dto.planType,
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        notes: dto.notes,
      },
      include: { goals: true },
    });

    await this.auditService.log({
      action: 'CARE_PLAN_UPDATED',
      entityType: 'CarePlan',
      entityId: id,
      userId,
      details: { patientId: plan.patientId, title: plan.title },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    const validStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const data: any = { status };
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      data.endDate = new Date();
    }

    const updated = await this.prisma.carePlan.update({ where: { id }, data });

    await this.auditService.log({
      action: `CARE_PLAN_${status}`,
      entityType: 'CarePlan',
      entityId: id,
      userId,
      details: { patientId: plan.patientId, title: plan.title, previousStatus: plan.status },
    });

    return updated;
  }

  // Goal management
  async addGoal(planId: string, dto: { title: string; description?: string; targetDate?: string; priority?: string }, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    const goal = await this.prisma.carePlanGoal.create({
      data: {
        carePlanId: planId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        priority: dto.priority || 'MEDIUM',
      },
    });

    await this.auditService.log({
      action: 'CARE_PLAN_GOAL_ADDED',
      entityType: 'CarePlanGoal',
      entityId: goal.id,
      userId,
      details: { carePlanId: planId, title: dto.title },
    });

    return goal;
  }

  async updateGoal(goalId: string, dto: { status?: string; achievedAt?: string; progressNotes?: string }, userId?: string) {
    const goal = await this.prisma.carePlanGoal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');

    const data: any = { ...dto };
    if (dto.achievedAt) data.achievedAt = new Date(dto.achievedAt);
    if (dto.status === 'ACHIEVED' && !dto.achievedAt) data.achievedAt = new Date();

    const updated = await this.prisma.carePlanGoal.update({ where: { id: goalId }, data });

    await this.auditService.log({
      action: 'CARE_PLAN_GOAL_UPDATED',
      entityType: 'CarePlanGoal',
      entityId: goalId,
      userId,
      details: { carePlanId: goal.carePlanId, title: goal.title, status: dto.status },
    });

    return updated;
  }

  // Intervention management
  async addIntervention(planId: string, dto: CreateInterventionDto, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    const intervention = await this.prisma.carePlanIntervention.create({
      data: {
        carePlanId: planId,
        title: dto.title,
        description: dto.description,
        interventionType: dto.interventionType,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignedToId: dto.assignedToId,
      },
    });

    await this.auditService.log({
      action: 'CARE_PLAN_INTERVENTION_ADDED',
      entityType: 'CarePlanIntervention',
      entityId: intervention.id,
      userId,
      details: { carePlanId: planId, title: dto.title, type: dto.interventionType },
    });

    return intervention;
  }

  async updateIntervention(interventionId: string, dto: Partial<CreateInterventionDto> & { status?: string }, userId?: string) {
    const intervention = await this.prisma.carePlanIntervention.findUnique({ where: { id: interventionId } });
    if (!intervention) throw new NotFoundException('Intervention not found');

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.carePlanIntervention.update({ where: { id: interventionId }, data });

    await this.auditService.log({
      action: 'CARE_PLAN_INTERVENTION_UPDATED',
      entityType: 'CarePlanIntervention',
      entityId: interventionId,
      userId,
      details: { carePlanId: intervention.carePlanId, title: intervention.title, status: dto.status },
    });

    return updated;
  }

  // Team member management
  async addTeamMember(planId: string, dto: CreateTeamMemberDto, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id: planId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    if (!dto.userId && !dto.name) {
      throw new BadRequestException('Either userId or name must be provided');
    }

    const member = await this.prisma.carePlanTeamMember.create({
      data: {
        carePlanId: planId,
        userId: dto.userId,
        name: dto.name,
        role: dto.role,
        responsibilities: dto.responsibilities,
      },
    });

    await this.auditService.log({
      action: 'CARE_PLAN_TEAM_MEMBER_ADDED',
      entityType: 'CarePlanTeamMember',
      entityId: member.id,
      userId,
      details: { carePlanId: planId, role: dto.role, name: dto.name },
    });

    return member;
  }

  async removeTeamMember(memberId: string, userId?: string) {
    const member = await this.prisma.carePlanTeamMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Team member not found');

    await this.prisma.carePlanTeamMember.delete({ where: { id: memberId } });

    await this.auditService.log({
      action: 'CARE_PLAN_TEAM_MEMBER_REMOVED',
      entityType: 'CarePlanTeamMember',
      entityId: memberId,
      userId,
      details: { carePlanId: member.carePlanId, role: member.role },
    });

    return { message: 'Team member removed' };
  }

  // Get care plans due for review
  async getDueForReview(daysAhead: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return this.prisma.carePlan.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        reviewDate: { lte: cutoff, gte: new Date() },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: 'asc' },
    });
  }

  async remove(id: string, userId?: string) {
    const plan = await this.prisma.carePlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Care plan not found');

    await this.prisma.carePlan.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      action: 'CARE_PLAN_DELETED',
      entityType: 'CarePlan',
      entityId: id,
      userId,
      details: { patientId: plan.patientId, title: plan.title },
    });

    return { message: 'Care plan deleted' };
  }
}
