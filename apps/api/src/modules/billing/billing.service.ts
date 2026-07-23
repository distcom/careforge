import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
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
  constructor(private prisma: PrismaService) {}

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

  async createCharge(dto: CreateChargeDto) {
    return this.prisma.charge.create({
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

  async createClaim(chargeIds: string[], payerName: string, payerId?: string) {
    const charges = await this.prisma.charge.findMany({ where: { id: { in: chargeIds } } });
    const totalAmount = charges.reduce((sum, c) => sum + Number(c.fee), 0);
    const claimNumber = `CLM-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    return this.prisma.claim.create({
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
  }

  async submitClaim(id: string) {
    return this.prisma.claim.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  // Payments
  async createPayment(dto: CreatePaymentDto, postedById?: string) {
    return this.prisma.payment.create({
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
