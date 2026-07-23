import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentQueryDto } from './dto/scheduling.dto';

@Injectable()
export class SchedulingService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AppointmentQueryDto): Promise<PaginatedResult<any>> {
    const where: any = {};

    if (query.providerId) where.providerId = query.providerId;
    if (query.facilityId) where.facilityId = query.facilityId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.dateFrom) where.startTime = { ...where.startTime, gte: new Date(query.dateFrom) };
    if (query.dateTo) where.startTime = { ...where.startTime, lte: new Date(query.dateTo) };
    if (query.type) where.type = query.type;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy || 'startTime']: query.sortOrder },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          provider: { select: { id: true, firstName: true, lastName: true, prefix: true } },
          facility: { select: { id: true, name: true } },
          resource: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return new PaginatedResult(appointments, total, query.page, query.limit);
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, dateOfBirth: true } },
        provider: { select: { id: true, firstName: true, lastName: true, prefix: true } },
        facility: { select: { id: true, name: true } },
        resource: true,
        encounter: { select: { id: true, status: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async create(dto: CreateAppointmentDto) {
    // Check for scheduling conflicts
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        providerId: dto.providerId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: new Date(dto.endTime), gte: new Date(dto.startTime) } },
          { endTime: { gt: new Date(dto.startTime), lte: new Date(dto.endTime) } },
          { AND: [{ startTime: { lte: new Date(dto.startTime) } }, { endTime: { gte: new Date(dto.endTime) } }] },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('Provider has a scheduling conflict at this time');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        facilityId: dto.facilityId,
        resourceId: dto.resourceId,
        type: dto.type,
        title: dto.title,
        reason: dto.reason,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        duration: dto.duration,
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurrenceId: dto.recurrenceId,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        facility: { select: { id: true, name: true } },
      },
    });

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw new BadRequestException(`Cannot modify a ${appointment.status.toLowerCase()} appointment`);
    }

    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);

    return this.prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(id: string, status: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const data: any = { status };
    if (status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelReason = reason;
    } else if (status === 'ARRIVED') {
      data.checkedInAt = new Date();
    } else if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    return this.prisma.appointment.update({ where: { id }, data });
  }

  async cancel(id: string, reason: string) {
    return this.updateStatus(id, 'CANCELLED', reason);
  }

  async getProviderSchedule(providerId: string, dateFrom: string, dateTo: string) {
    return this.prisma.appointment.findMany({
      where: {
        providerId,
        startTime: { gte: new Date(dateFrom), lte: new Date(dateTo) },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getAvailableSlots(providerId: string, date: string, duration: number = 30) {
    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    const existing = await this.prisma.appointment.findMany({
      where: {
        providerId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { startTime: 'asc' },
      select: { startTime: true, endTime: true },
    });

    const slots: { start: string; end: string; available: boolean }[] = [];
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      if (slotEnd > dayEnd) break;

      const isBooked = existing.some(
        (apt) => current < apt.endTime && slotEnd > apt.startTime,
      );

      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked,
      });

      current = slotEnd;
    }

    return slots;
  }
}
