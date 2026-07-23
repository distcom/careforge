import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalPatients, todayAppointments, pendingClaims, unreadMessages] = await Promise.all([
      this.prisma.patient.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.appointment.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)), lte: new Date(new Date().setHours(23, 59, 59, 999)) },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),
      this.prisma.claim.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      this.prisma.message.count({ where: { isRead: false, deletedAt: null } }),
    ]);

    return { totalPatients, todayAppointments, pendingClaims, unreadMessages };
  }

  async getPatientCensus(dateFrom?: string, dateTo?: string) {
    const where: any = { deletedAt: null };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [newPatients, totalPatients] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    return { newPatients, totalPatients, period: { dateFrom, dateTo } };
  }

  async getRevenueReport(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.postedAt = {};
      if (dateFrom) where.postedAt.gte = new Date(dateFrom);
      if (dateTo) where.postedAt.lte = new Date(dateTo);
    }

    const [totalPayments, totalCharges] = await Promise.all([
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
      this.prisma.charge.aggregate({
        where: dateFrom || dateTo ? { serviceDate: where.postedAt } : {},
        _sum: { fee: true },
      }),
    ]);

    return {
      totalRevenue: Number(totalPayments._sum.amount || 0),
      totalCharges: Number(totalCharges._sum.fee || 0),
      outstanding: Number(totalCharges._sum.fee || 0) - Number(totalPayments._sum.amount || 0),
    };
  }

  async getEncounterReport(dateFrom?: string, dateTo?: string) {
    const where: any = { deletedAt: null };
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const [totalEncounters, byType] = await Promise.all([
      this.prisma.encounter.count({ where }),
      this.prisma.encounter.groupBy({ by: ['type'], where, _count: true }),
    ]);

    return { totalEncounters, byType };
  }

  async getAccountsReceivable() {
    const [current, thirtyDays, sixtyDays, ninetyPlus] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        _sum: { fee: true },
      }),
    ]);

    return {
      current: Number(current._sum.fee || 0),
      thirtyDays: Number(thirtyDays._sum.fee || 0),
      sixtyDays: Number(sixtyDays._sum.fee || 0),
      ninetyPlus: Number(ninetyPlus._sum.fee || 0),
      total: Number(current._sum.fee || 0) + Number(thirtyDays._sum.fee || 0) + Number(sixtyDays._sum.fee || 0) + Number(ninetyPlus._sum.fee || 0),
    };
  }
}
