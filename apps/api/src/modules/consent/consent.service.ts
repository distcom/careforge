import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateConsentDto {
  patientId: string;
  consentType: string;
  scope?: string;
  restrictions?: string;
  expiresAt?: string;
  documentId?: string;
  notes?: string;
}

export interface SignConsentDto {
  witnessName?: string;
}

export interface RevokeConsentDto {
  reason: string;
}

export interface CreateRestrictionDto {
  patientId: string;
  restrictionType: string;
  level?: string;
  reason?: string;
  restrictedToRoles?: string;
  restrictedToUsers?: string;
  expiresAt?: string;
  notes?: string;
}

export interface AccessOverrideDto {
  patientId: string;
  restrictionId?: string;
  overrideType: string;
  reason: string;
  ipAddress?: string;
  durationMinutes?: number;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Consent management
  async findAllConsents(patientId: string, query: PaginationQuery & { consentType?: string; status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.consentType) where.consentType = query.consentType;
    if (query.status) where.status = query.status;

    const [consents, total] = await Promise.all([
      this.prisma.consent.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          signedBy: { select: { firstName: true, lastName: true } },
          document: { select: { id: true, title: true } },
        },
      }),
      this.prisma.consent.count({ where }),
    ]);
    return new PaginatedResult(consents, total, query.page, query.limit);
  }

  async createConsent(dto: CreateConsentDto, userId?: string) {
    const consent = await this.prisma.consent.create({
      data: {
        patientId: dto.patientId,
        consentType: dto.consentType,
        scope: dto.scope,
        restrictions: dto.restrictions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        documentId: dto.documentId,
        notes: dto.notes,
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      action: 'CONSENT_CREATED',
      entityType: 'Consent',
      entityId: consent.id,
      userId,
      details: {
        patientId: dto.patientId,
        consentType: dto.consentType,
      },
    });

    return consent;
  }

  async signConsent(id: string, dto: SignConsentDto, userId?: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id } });
    if (!consent) throw new NotFoundException('Consent not found');

    if (consent.status !== 'PENDING') {
      throw new BadRequestException('Only pending consents can be signed');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: {
        status: 'GRANTED',
        grantedAt: new Date(),
        signedById: userId,
        signedAt: new Date(),
        witnessName: dto.witnessName,
        witnessSignedAt: dto.witnessName ? new Date() : null,
      },
    });

    await this.auditService.log({
      action: 'CONSENT_GRANTED',
      entityType: 'Consent',
      entityId: id,
      userId,
      details: {
        patientId: consent.patientId,
        consentType: consent.consentType,
        witnessName: dto.witnessName,
      },
    });

    return updated;
  }

  async denyConsent(id: string, userId?: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id } });
    if (!consent) throw new NotFoundException('Consent not found');

    if (consent.status !== 'PENDING') {
      throw new BadRequestException('Only pending consents can be denied');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: { status: 'DENIED' },
    });

    await this.auditService.log({
      action: 'CONSENT_DENIED',
      entityType: 'Consent',
      entityId: id,
      userId,
      details: { patientId: consent.patientId, consentType: consent.consentType },
    });

    return updated;
  }

  async revokeConsent(id: string, dto: RevokeConsentDto, userId?: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id } });
    if (!consent) throw new NotFoundException('Consent not found');

    if (consent.status !== 'GRANTED') {
      throw new BadRequestException('Only granted consents can be revoked');
    }

    const updated = await this.prisma.consent.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: dto.reason,
        revokedById: userId,
      },
    });

    await this.auditService.log({
      action: 'CONSENT_REVOKED',
      entityType: 'Consent',
      entityId: id,
      userId,
      details: {
        patientId: consent.patientId,
        consentType: consent.consentType,
        reason: dto.reason,
      },
    });

    return updated;
  }

  // Privacy restriction management
  async findAllRestrictions(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, isActive: true };

    const [restrictions, total] = await Promise.all([
      this.prisma.privacyRestriction.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.privacyRestriction.count({ where }),
    ]);
    return new PaginatedResult(restrictions, total, query.page, query.limit);
  }

  async createRestriction(dto: CreateRestrictionDto, userId?: string) {
    const restriction = await this.prisma.privacyRestriction.create({
      data: {
        patientId: dto.patientId,
        restrictionType: dto.restrictionType,
        level: dto.level || 'STANDARD',
        reason: dto.reason,
        restrictedToRoles: dto.restrictedToRoles,
        restrictedToUsers: dto.restrictedToUsers,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes,
        createdById: userId,
      },
    });

    await this.auditService.log({
      action: 'PRIVACY_RESTRICTION_CREATED',
      entityType: 'PrivacyRestriction',
      entityId: restriction.id,
      userId,
      details: {
        patientId: dto.patientId,
        restrictionType: dto.restrictionType,
        level: dto.level,
      },
    });

    return restriction;
  }

  async removeRestriction(id: string, userId?: string) {
    const restriction = await this.prisma.privacyRestriction.findUnique({ where: { id } });
    if (!restriction) throw new NotFoundException('Restriction not found');

    await this.prisma.privacyRestriction.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      action: 'PRIVACY_RESTRICTION_REMOVED',
      entityType: 'PrivacyRestriction',
      entityId: id,
      userId,
      details: { patientId: restriction.patientId, restrictionType: restriction.restrictionType },
    });

    return { message: 'Restriction removed' };
  }

  // Access override (break glass)
  async recordAccessOverride(dto: AccessOverrideDto, userId: string) {
    const override = await this.prisma.accessOverride.create({
      data: {
        patientId: dto.patientId,
        userId,
        restrictionId: dto.restrictionId,
        overrideType: dto.overrideType,
        reason: dto.reason,
        ipAddress: dto.ipAddress,
        durationMinutes: dto.durationMinutes,
      },
    });

    // Log as high-priority audit event
    await this.auditService.log({
      action: 'ACCESS_OVERRIDE',
      entityType: 'AccessOverride',
      entityId: override.id,
      userId,
      details: {
        patientId: dto.patientId,
        overrideType: dto.overrideType,
        reason: dto.reason,
        restrictionId: dto.restrictionId,
      },
    });

    this.logger.warn(`Access override recorded: user ${userId} accessed patient ${dto.patientId} (${dto.overrideType})`);

    return override;
  }

  async getAccessOverrides(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };

    const [overrides, total] = await Promise.all([
      this.prisma.accessOverride.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          restriction: { select: { restrictionType: true, level: true } },
        },
      }),
      this.prisma.accessOverride.count({ where }),
    ]);
    return new PaginatedResult(overrides, total, query.page, query.limit);
  }

  // Check if user can access patient (for middleware/guard use)
  async checkAccess(patientId: string, userId: string, userRoles: string[]): Promise<{ allowed: boolean; restriction?: any }> {
    const restrictions = await this.prisma.privacyRestriction.findMany({
      where: {
        patientId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (restrictions.length === 0) {
      return { allowed: true };
    }

    // Check if user is in restricted list
    for (const restriction of restrictions) {
      if (restriction.restrictedToUsers) {
        const allowedUsers = JSON.parse(restriction.restrictedToUsers);
        if (allowedUsers.includes(userId)) {
          continue; // User is explicitly allowed
        }
      }

      if (restriction.restrictedToRoles) {
        const allowedRoles = JSON.parse(restriction.restrictedToRoles);
        if (userRoles.some((role) => allowedRoles.includes(role))) {
          continue; // User has allowed role
        }
      }

      // User is not in allowed list
      return { allowed: false, restriction };
    }

    return { allowed: true };
  }
}
