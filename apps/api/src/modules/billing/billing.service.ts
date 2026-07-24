import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CreateChargeDto {
  patientId: string;
  encounterId?: string;
  providerId?: string;
  cptCode: string;
  description: string;
  modifiers?: string;
  units?: number;
  fee: number;
  serviceDate: string;
}

export interface CreatePaymentDto {
  patientId?: string;
  claimId?: string;
  amount: number;
  method: string;
  reference?: string;
  source?: string;
  notes?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Charges
  async findCharges(query: PaginationQuery & { patientId?: string; status?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    const [charges, total] = await Promise.all([
      this.prisma.charge.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          encounter: { select: { id: true, type: true } },
        },
      }),
      this.prisma.charge.count({ where }),
    ]);
    return new PaginatedResult(charges, total, query.page, query.limit);
  }

  async createCharge(dto: CreateChargeDto, userId?: string) {
    const charge = await this.prisma.charge.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        providerId: dto.providerId,
        cptCode: dto.cptCode,
        description: dto.description,
        modifiers: dto.modifiers,
        units: dto.units || 1,
        fee: dto.fee,
        serviceDate: new Date(dto.serviceDate),
      },
    });

    await this.auditService.log({
      action: 'CHARGE_CREATED',
      entityType: 'Charge',
      entityId: charge.id,
      userId,
      details: {
        patientId: dto.patientId,
        cptCode: dto.cptCode,
        fee: dto.fee,
      },
    });

    return charge;
  }

  // Claims
  async findClaims(query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [claims, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { charge: { select: { description: true, cptCode: true } } } } },
      }),
      this.prisma.claim.count({ where }),
    ]);
    return new PaginatedResult(claims, total, query.page, query.limit);
  }

  async createClaim(chargeIds: string[], payerName: string, payerId?: string, userId?: string) {
    const charges = await this.prisma.charge.findMany({ where: { id: { in: chargeIds } } });
    const totalAmount = charges.reduce((sum, c) => sum + Number(c.fee), 0);
    const claimNumber = `CLM-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const claim = await this.prisma.claim.create({
      data: {
        claimNumber,
        patientId: charges[0]?.patientId,
        payerName,
        payerId,
        totalAmount,
        status: 'DRAFT',
        items: {
          create: charges.map((c) => ({
            chargeId: c.id,
            cptCode: c.cptCode,
            description: c.description,
            fee: c.fee,
          })),
        },
      },
      include: { items: true },
    });

    await this.auditService.log({
      action: 'CLAIM_CREATED',
      entityType: 'Claim',
      entityId: claim.id,
      userId,
      details: {
        claimNumber,
        patientId: charges[0]?.patientId,
        totalAmount,
        chargeCount: chargeIds.length,
      },
    });

    return claim;
  }

  async submitClaim(id: string, userId?: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');

    const updated = await this.prisma.claim.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await this.auditService.log({
      action: 'CLAIM_SUBMITTED',
      entityType: 'Claim',
      entityId: id,
      userId,
      details: {
        claimNumber: claim.claimNumber,
        patientId: claim.patientId,
        totalAmount: claim.totalAmount,
      },
    });

    return updated;
  }

  async recordRemittance(id: string, amount: number, status: string, userId?: string) {
    const claim = await this.prisma.claim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');

    const updated = await this.prisma.claim.update({
      where: { id },
      data: {
        status,
        paidAmount: amount,
        remittanceAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'REMITTANCE_RECORDED',
      entityType: 'Claim',
      entityId: id,
      userId,
      details: {
        claimNumber: claim.claimNumber,
        amount,
        status,
      },
    });

    return updated;
  }

  // Payments
  async createPayment(dto: CreatePaymentDto, postedById?: string) {
    const payment = await this.prisma.payment.create({
      data: {
        patientId: dto.patientId,
        claimId: dto.claimId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        source: dto.source || 'patient',
        postedById,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'PAYMENT_POSTED',
      entityType: 'Payment',
      entityId: payment.id,
      userId: postedById,
      details: {
        patientId: dto.patientId,
        amount: dto.amount,
        method: dto.method,
        source: dto.source,
      },
    });

    this.logger.log(`Payment posted: $${dto.amount} for patient ${dto.patientId}`);

    return payment;
  }

  async getPatientBalance(patientId: string) {
    const charges = await this.prisma.charge.aggregate({
      where: { patientId, status: { in: ['PENDING', 'BILLED'] } },
      _sum: { fee: true },
    });
    const payments = await this.prisma.payment.aggregate({
      where: { patientId },
      _sum: { amount: true },
    });
    const totalCharges = Number(charges._sum.fee || 0);
    const totalPayments = Number(payments._sum.amount || 0);
    return { totalCharges, totalPayments, balance: totalCharges - totalPayments };
  }

  // Fee Schedules
  async getFeeSchedules() {
    return this.prisma.feeSchedule.findMany({
      where: { isActive: true },
      include: { items: true },
    });
  }
}
