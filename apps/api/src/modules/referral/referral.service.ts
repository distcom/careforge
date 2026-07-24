import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateReferralDto {
  patientId: string;
  referringProviderId?: string;
  referredToName: string;
  referredToSpecialty?: string;
  referredToNpi?: string;
  reason: string;
  urgency?: string;
  clinicalInfo?: string;
  diagnosisCodes?: string;
  requestedServices?: string;
  authRequired?: boolean;
  expiresAt?: string;
  notes?: string;
}

export interface AuthRequestDto {
  authNumber?: string;
  requestedServices?: string;
  diagnosisCodes?: string;
  clinicalInfo?: string;
}

export interface AuthDecisionDto {
  approved: boolean;
  authNumber?: string;
  validUntil?: string;
  visitsAuthorized?: number;
  denialReason?: string;
}

// Valid referral status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['AUTHORIZED', 'SCHEDULED', 'CANCELLED', 'EXPIRED'],
  AUTHORIZED: ['SCHEDULED', 'CANCELLED', 'EXPIRED'],
  SCHEDULED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
  NO_SHOW: ['SCHEDULED'], // Allow re-scheduling after no-show
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string; authStatus?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;
    if (query.authStatus) where.authStatus = query.authStatus;

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referringProvider: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);
    return new PaginatedResult(referrals, total, query.page, query.limit);
  }

  async findById(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true, mrn: true } },
        referringProvider: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  async create(dto: CreateReferralDto, userId?: string) {
    const referral = await this.prisma.referral.create({
      data: {
        patientId: dto.patientId,
        referringProviderId: dto.referringProviderId,
        referredToName: dto.referredToName,
        referredToSpecialty: dto.referredToSpecialty,
        referredToNpi: dto.referredToNpi,
        reason: dto.reason,
        urgency: dto.urgency || 'ROUTINE',
        status: 'PENDING',
        clinicalInfo: dto.clinicalInfo,
        diagnosisCodes: dto.diagnosisCodes,
        requestedServices: dto.requestedServices,
        authRequired: dto.authRequired || false,
        authStatus: dto.authRequired ? 'PENDING' : null,
        authRequestedAt: dto.authRequired ? new Date() : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'REFERRAL_CREATED',
      entityType: 'Referral',
      entityId: referral.id,
      userId,
      details: {
        patientId: dto.patientId,
        referredToName: dto.referredToName,
        urgency: dto.urgency,
        authRequired: dto.authRequired,
      },
    });

    // Log if authorization is required
    if (dto.authRequired) {
      await this.auditService.log({
        action: 'AUTH_REQUESTED',
        entityType: 'Referral',
        entityId: referral.id,
        userId,
        details: {
          patientId: dto.patientId,
          referredToName: dto.referredToName,
          requestedServices: dto.requestedServices,
        },
      });
    }

    return referral;
  }

  async updateStatus(id: string, status: string, userId?: string, reason?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[referral.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition referral from ${referral.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    const data: any = { status };

    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    } else if (status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelReason = reason;
    }

    const updated = await this.prisma.referral.update({ where: { id }, data });

    await this.auditService.log({
      action: `REFERRAL_${status}`,
      entityType: 'Referral',
      entityId: id,
      userId,
      details: {
        patientId: referral.patientId,
        previousStatus: referral.status,
        newStatus: status,
        reason,
      },
    });

    return updated;
  }

  async requestAuthorization(id: string, dto: AuthRequestDto, userId?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.authStatus === 'APPROVED') {
      throw new BadRequestException('Authorization already approved for this referral');
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        authRequired: true,
        authStatus: 'PENDING',
        authRequestedAt: new Date(),
        authNumber: dto.authNumber,
        requestedServices: dto.requestedServices || referral.requestedServices,
        diagnosisCodes: dto.diagnosisCodes || referral.diagnosisCodes,
        clinicalInfo: dto.clinicalInfo || referral.clinicalInfo,
      },
    });

    await this.auditService.log({
      action: 'AUTH_REQUESTED',
      entityType: 'Referral',
      entityId: id,
      userId,
      details: {
        patientId: referral.patientId,
        referredToName: referral.referredToName,
        authNumber: dto.authNumber,
      },
    });

    return updated;
  }

  async recordAuthDecision(id: string, dto: AuthDecisionDto, userId?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.authStatus !== 'PENDING') {
      throw new BadRequestException('No pending authorization request for this referral');
    }

    const data: any = {
      authStatus: dto.approved ? 'APPROVED' : 'DENIED',
      authDecidedAt: new Date(),
    };

    if (dto.approved) {
      data.authNumber = dto.authNumber || referral.authNumber;
      data.authValidUntil = dto.validUntil ? new Date(dto.validUntil) : null;
      data.authVisitsAuthorized = dto.visitsAuthorized;
      data.status = 'AUTHORIZED';
    } else {
      data.authDenialReason = dto.denialReason;
    }

    const updated = await this.prisma.referral.update({ where: { id }, data });

    await this.auditService.log({
      action: dto.approved ? 'AUTH_APPROVED' : 'AUTH_DENIED',
      entityType: 'Referral',
      entityId: id,
      userId,
      details: {
        patientId: referral.patientId,
        referredToName: referral.referredToName,
        authNumber: dto.authNumber,
        denialReason: dto.denialReason,
        visitsAuthorized: dto.visitsAuthorized,
      },
    });

    return updated;
  }

  async recordVisit(id: string, userId?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.authStatus !== 'APPROVED') {
      throw new BadRequestException('Cannot record visit - authorization not approved');
    }

    if (referral.authVisitsAuthorized && referral.authVisitsUsed >= referral.authVisitsAuthorized) {
      throw new BadRequestException('All authorized visits have been used');
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: { authVisitsUsed: { increment: 1 } },
    });

    await this.auditService.log({
      action: 'AUTH_VISIT_RECORDED',
      entityType: 'Referral',
      entityId: id,
      userId,
      details: {
        patientId: referral.patientId,
        visitsUsed: updated.authVisitsUsed,
        visitsAuthorized: referral.authVisitsAuthorized,
      },
    });

    return updated;
  }

  async getPendingAuthorizations(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { authStatus: 'PENDING' };

    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { authRequestedAt: 'asc' },
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          referringProvider: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return new PaginatedResult(referrals, total, query.page, query.limit);
  }

  async getExpiringAuthorizations(daysAhead: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return this.prisma.referral.findMany({
      where: {
        authStatus: 'APPROVED',
        authValidUntil: { lte: cutoff, gte: new Date() },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
      orderBy: { authValidUntil: 'asc' },
    });
  }

  async remove(id: string, userId?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    await this.prisma.referral.delete({ where: { id } });

    await this.auditService.log({
      action: 'REFERRAL_DELETED',
      entityType: 'Referral',
      entityId: id,
      userId,
      details: {
        patientId: referral.patientId,
        referredToName: referral.referredToName,
      },
    });

    return { message: 'Referral deleted' };
  }
}
