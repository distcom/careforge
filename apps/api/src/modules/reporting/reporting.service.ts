import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface DateRange {
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private buildDateFilter(field: string, range?: DateRange): any {
    if (!range?.dateFrom && !range?.dateTo) return {};
    const filter: any = {};
    if (range.dateFrom) filter.gte = new Date(range.dateFrom);
    if (range.dateTo) filter.lte = new Date(range.dateTo);
    return { [field]: filter };
  }

  // Dashboard & Overview
  async getDashboardStats(userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPatients,
      todayAppointments,
      pendingClaims,
      unreadMessages,
      pendingLabs,
      activeReferrals,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.appointment.count({
        where: {
          startTime: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),
      this.prisma.claim.count({ where: { status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      this.prisma.message.count({ where: { isRead: false, deletedAt: null } }),
      this.prisma.labOrder.count({ where: { status: { in: ['ORDERED', 'COLLECTED', 'PROCESSING'] } } }),
      this.prisma.referral.count({ where: { status: { in: ['PENDING', 'AUTHORIZED', 'SCHEDULED'] } } }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'dashboard',
        userId,
        details: { reportType: 'DASHBOARD_STATS' },
      });
    }

    return {
      totalPatients,
      todayAppointments,
      pendingClaims,
      unreadMessages,
      pendingLabs,
      activeReferrals,
    };
  }

  // Patient Demographics & Census
  async getPatientCensus(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('createdAt', range);
    const where = { deletedAt: null, ...dateFilter };

    const [newPatients, totalPatients, byGender, byStatus] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.patient.groupBy({
        by: ['gender'],
        where: { status: 'ACTIVE', deletedAt: null },
        _count: true,
      }),
      this.prisma.patient.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'patient-census',
        userId,
        details: { reportType: 'PATIENT_CENSUS', range },
      });
    }

    return { newPatients, totalPatients, byGender, byStatus, period: range };
  }

  // Clinical Reports
  async getClinicalSummary(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('createdAt', range);

    const [
      totalEncounters,
      encountersByType,
      activeConditions,
      activeMedications,
      pendingLabs,
      dueImmunizations,
    ] = await Promise.all([
      this.prisma.encounter.count({ where: { deletedAt: null, ...dateFilter } }),
      this.prisma.encounter.groupBy({
        by: ['type'],
        where: { deletedAt: null, ...dateFilter },
        _count: true,
      }),
      this.prisma.condition.count({ where: { status: 'ACTIVE' } }),
      this.prisma.medication.count({ where: { status: 'ACTIVE' } }),
      this.prisma.labOrder.count({ where: { status: { in: ['ORDERED', 'COLLECTED', 'PROCESSING'] } } }),
      this.prisma.immunization.count({
        where: {
          status: 'completed',
          administeredAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'clinical-summary',
        userId,
        details: { reportType: 'CLINICAL_SUMMARY', range },
      });
    }

    return {
      totalEncounters,
      encountersByType,
      activeConditions,
      activeMedications,
      pendingLabs,
      dueImmunizations,
      period: range,
    };
  }

  async getProviderProductivity(providerId?: string, range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('startTime', range);
    const where: any = { deletedAt: null, ...dateFilter };
    if (providerId) where.providerId = providerId;

    const [encounters, appointments, byProvider] = await Promise.all([
      this.prisma.encounter.count({ where }),
      this.prisma.appointment.count({
        where: {
          ...this.buildDateFilter('startTime', range),
          status: 'COMPLETED',
          ...(providerId ? { providerId } : {}),
        },
      }),
      this.prisma.encounter.groupBy({
        by: ['providerId'],
        where,
        _count: true,
      }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'provider-productivity',
        userId,
        details: { reportType: 'PROVIDER_PRODUCTIVITY', providerId, range },
      });
    }

    return { totalEncounters: encounters, completedAppointments: appointments, byProvider, period: range };
  }

  // Financial Reports
  async getRevenueReport(range?: DateRange, userId?: string) {
    const paymentFilter = this.buildDateFilter('postedAt', range);
    const chargeFilter = this.buildDateFilter('serviceDate', range);

    const [totalPayments, totalCharges, paymentsByMethod] = await Promise.all([
      this.prisma.payment.aggregate({ where: paymentFilter, _sum: { amount: true } }),
      this.prisma.charge.aggregate({ where: chargeFilter, _sum: { fee: true } }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: paymentFilter,
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(totalPayments._sum.amount || 0);
    const totalCharged = Number(totalCharges._sum.fee || 0);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'revenue',
        userId,
        details: { reportType: 'REVENUE', range },
      });
    }

    return {
      totalRevenue,
      totalCharges: totalCharged,
      outstanding: totalCharged - totalRevenue,
      paymentsByMethod,
      period: range,
    };
  }

  async getAccountsReceivable(userId?: string) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const [current, thirtyDays, sixtyDays, ninetyPlus] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(now - 30 * day) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(now - 60 * day), lt: new Date(now - 30 * day) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { gte: new Date(now - 90 * day), lt: new Date(now - 60 * day) } },
        _sum: { fee: true },
      }),
      this.prisma.charge.aggregate({
        where: { status: { in: ['PENDING', 'BILLED'] }, serviceDate: { lt: new Date(now - 90 * day) } },
        _sum: { fee: true },
      }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'accounts-receivable',
        userId,
        details: { reportType: 'ACCOUNTS_RECEIVABLE' },
      });
    }

    return {
      current: Number(current._sum.fee || 0),
      thirtyDays: Number(thirtyDays._sum.fee || 0),
      sixtyDays: Number(sixtyDays._sum.fee || 0),
      ninetyPlus: Number(ninetyPlus._sum.fee || 0),
      total:
        Number(current._sum.fee || 0) +
        Number(thirtyDays._sum.fee || 0) +
        Number(sixtyDays._sum.fee || 0) +
        Number(ninetyPlus._sum.fee || 0),
    };
  }

  async getClaimsReport(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('createdAt', range);

    const [totalClaims, byStatus, byPayer] = await Promise.all([
      this.prisma.claim.count({ where: dateFilter }),
      this.prisma.claim.groupBy({ by: ['status'], where: dateFilter, _count: true }),
      this.prisma.claim.groupBy({ by: ['payerName'], where: dateFilter, _count: true, _sum: { totalAmount: true } }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'claims',
        userId,
        details: { reportType: 'CLAIMS', range },
      });
    }

    return { totalClaims, byStatus, byPayer, period: range };
  }

  // Operational Reports
  async getAppointmentUtilization(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('startTime', range);

    const [total, byStatus, byType, noShowRate] = await Promise.all([
      this.prisma.appointment.count({ where: dateFilter }),
      this.prisma.appointment.groupBy({ by: ['status'], where: dateFilter, _count: true }),
      this.prisma.appointment.groupBy({ by: ['type'], where: dateFilter, _count: true }),
      this.prisma.appointment.count({ where: { ...dateFilter, status: 'NO_SHOW' } }),
    ]);

    const noShowPercentage = total > 0 ? ((noShowRate / total) * 100).toFixed(1) : '0';

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'appointment-utilization',
        userId,
        details: { reportType: 'APPOINTMENT_UTILIZATION', range },
      });
    }

    return {
      totalAppointments: total,
      byStatus,
      byType,
      noShowRate: { count: noShowRate, percentage: noShowPercentage },
      period: range,
    };
  }

  async getLabTurnaround(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('orderedAt', range);

    const [totalLabs, byStatus, criticalResults] = await Promise.all([
      this.prisma.labOrder.count({ where: dateFilter }),
      this.prisma.labOrder.groupBy({ by: ['status'], where: dateFilter, _count: true }),
      this.prisma.labOrder.count({ where: { ...dateFilter, isCritical: true } }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'lab-turnaround',
        userId,
        details: { reportType: 'LAB_TURNAROUND', range },
      });
    }

    return { totalLabs, byStatus, criticalResults, period: range };
  }

  // Encounter Reports
  async getEncounterReport(range?: DateRange, userId?: string) {
    const dateFilter = this.buildDateFilter('createdAt', range);
    const where = { deletedAt: null, ...dateFilter };

    const [totalEncounters, byType, byStatus] = await Promise.all([
      this.prisma.encounter.count({ where }),
      this.prisma.encounter.groupBy({ by: ['type'], where, _count: true }),
      this.prisma.encounter.groupBy({ by: ['status'], where, _count: true }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'REPORT_ACCESSED',
        entityType: 'Report',
        entityId: 'encounters',
        userId,
        details: { reportType: 'ENCOUNTERS', range },
      });
    }

    return { totalEncounters, byType, byStatus, period: range };
  }
}
