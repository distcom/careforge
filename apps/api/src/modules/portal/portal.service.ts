import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getPatientDashboard(patientId: string) {
    const [appointments, labOrders, medications, messages] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        orderBy: { startTime: 'asc' },
        take: 5,
        include: { provider: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.labOrder.findMany({
        where: { patientId, status: 'RESULTED' },
        orderBy: { resultedAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
      this.prisma.medication.findMany({
        where: { patientId, status: 'ACTIVE', deletedAt: null },
        take: 10,
      }),
      this.prisma.messageThread.findMany({
        where: { patientId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    ]);

    return { upcomingAppointments: appointments, recentLabResults: labOrders, activeMedications: medications, recentMessages: messages };
  }

  async getAppointments(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };
    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { startTime: 'desc' },
        include: { provider: { select: { firstName: true, lastName: true } }, facility: { select: { name: true } } },
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return new PaginatedResult(appointments, total, query.page, query.limit);
  }

  async getLabResults(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, status: 'RESULTED' };
    const [orders, total] = await Promise.all([
      this.prisma.labOrder.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { resultedAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.labOrder.count({ where }),
    ]);
    return new PaginatedResult(orders, total, query.page, query.limit);
  }

  async getMedications(patientId: string) {
    return this.prisma.medication.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllergies(patientId: string) {
    return this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocuments(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, deletedAt: null };
    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);
    return new PaginatedResult(documents, total, query.page, query.limit);
  }

  async getBills(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, status: { not: 'PAID' } };
    const [claims, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.claim.count({ where }),
    ]);
    return new PaginatedResult(claims, total, query.page, query.limit);
  }

  async requestAppointment(patientId: string, dto: { providerId: string; preferredDate: string; reason: string }) {
    return this.prisma.appointment.create({
      data: {
        patientId,
        providerId: dto.providerId,
        startTime: new Date(dto.preferredDate),
        endTime: new Date(new Date(dto.preferredDate).getTime() + 30 * 60000),
        reason: dto.reason,
        status: 'REQUESTED',
        type: 'OFFICE_VISIT',
      },
    });
  }
}
