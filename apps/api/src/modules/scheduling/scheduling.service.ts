import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentQueryDto } from './dto/scheduling.dto';

export interface AvailableSlot {
  start: string;
  end: string;
  available: boolean;
  providerId?: string;
  resourceId?: string;
}

export interface PatientFlowStatus {
  appointmentId: string;
  status: string;
  patientName: string;
  providerName: string;
  scheduledTime: Date;
  checkedInAt?: Date | null;
  roomedAt?: Date | null;
  providerSeenAt?: Date | null;
  checkedOutAt?: Date | null;
  waitTimeMinutes?: number;
  room: string | null;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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
          appointmentType: { select: { id: true, name: true, color: true } },
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
        appointmentType: true,
        encounter: { select: { id: true, status: true } },
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async create(dto: CreateAppointmentDto, scheduledById?: string) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // Check provider conflict
    const providerConflict = await this.checkProviderConflict(dto.providerId, startTime, endTime);
    if (providerConflict) {
      throw new ConflictException({
        message: 'Provider has a scheduling conflict at this time',
        conflict: providerConflict,
      });
    }

    // Check resource conflict if resourceId provided
    if (dto.resourceId) {
      const resourceConflict = await this.checkResourceConflict(dto.resourceId, startTime, endTime);
      if (resourceConflict) {
        throw new ConflictException({
          message: 'Resource is not available at this time',
          conflict: resourceConflict,
        });
      }
    }

    // Check provider availability (schedule template)
    const isAvailable = await this.checkProviderAvailability(dto.providerId, dto.facilityId, startTime);
    if (!isAvailable) {
      throw new BadRequestException('Provider is not available at this time (outside scheduled hours or exception)');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        facilityId: dto.facilityId,
        appointmentTypeId: dto.appointmentTypeId,
        resourceId: dto.resourceId,
        roomId: dto.resourceId, // Keep backward compatibility
        type: dto.type,
        reason: dto.title || dto.reason,
        startTime,
        endTime,
        duration: dto.duration,
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurringId: dto.recurrenceId,
        scheduledById,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        facility: { select: { id: true, name: true } },
        appointmentType: true,
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'APPOINTMENT_SCHEDULED',
      entityType: 'Appointment',
      entityId: appointment.id,
      userId: scheduledById,
      details: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        startTime: dto.startTime,
        type: dto.type,
      },
    });

    this.logger.log(`Appointment scheduled: ${appointment.id} for patient ${dto.patientId}`);

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

  // Patient Flow Operations
  async checkIn(id: string, userId?: string) {
    return this.updateFlowStatus(id, 'ARRIVED', { checkedInAt: new Date() }, userId, 'PATIENT_CHECKED_IN');
  }

  async roomPatient(id: string, roomId?: string, userId?: string) {
    const data: any = { roomedAt: new Date() };
    if (roomId) {
      data.roomId = roomId;
      data.resourceId = roomId;
    }
    return this.updateFlowStatus(id, 'ROOMED', data, userId, 'PATIENT_ROOMED');
  }

  async providerSeen(id: string, userId?: string) {
    return this.updateFlowStatus(id, 'IN_PROGRESS', { providerSeenAt: new Date() }, userId, 'PROVIDER_SEEN');
  }

  async checkOut(id: string, userId?: string) {
    return this.updateFlowStatus(id, 'COMPLETED', { checkedOutAt: new Date(), completedAt: new Date() }, userId, 'PATIENT_CHECKED_OUT');
  }

  async recordNoShow(id: string, userId?: string) {
    return this.updateFlowStatus(id, 'NO_SHOW', { noShowRecordedAt: new Date() }, userId, 'NO_SHOW_RECORDED');
  }

  async cancel(id: string, reason: string, userId?: string) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.auditService.log({
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: id,
      userId,
      details: { reason, patientId: appointment.patientId },
    });

    return updated;
  }

  private async updateFlowStatus(id: string, status: string, data: any, userId?: string, auditAction?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status, ...data },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (auditAction) {
      await this.auditService.log({
        action: auditAction,
        entityType: 'Appointment',
        entityId: id,
        userId,
        details: {
          patientId: appointment.patientId,
          status,
        },
      });
    }

    return updated;
  }

  // Availability Operations
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
        appointmentType: { select: { name: true, color: true } },
      },
    });
  }

  async getAvailableSlots(providerId: string, date: string, duration: number = 30, facilityId?: string): Promise<AvailableSlot[]> {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get provider's schedule template for this day
    const schedule = await this.prisma.providerSchedule.findFirst({
      where: {
        providerId,
        facilityId: facilityId || null,
        dayOfWeek,
        isActive: true,
      },
    });

    // Check for exceptions (time off, holidays)
    const exception = await this.prisma.scheduleException.findFirst({
      where: {
        providerId,
        date: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
      },
    });

    // If all-day exception, no slots available
    if (exception && !exception.startTime) {
      return [];
    }

    // Use schedule template or default hours
    let dayStart: Date;
    let dayEnd: Date;

    if (schedule) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      dayStart = new Date(targetDate);
      dayStart.setHours(startHour, startMin, 0, 0);
      dayEnd = new Date(targetDate);
      dayEnd.setHours(endHour, endMin, 0, 0);
      duration = schedule.slotDuration;
    } else {
      // Default hours if no schedule template
      dayStart = new Date(targetDate);
      dayStart.setHours(8, 0, 0, 0);
      dayEnd = new Date(targetDate);
      dayEnd.setHours(17, 0, 0, 0);
    }

    // Get existing appointments
    const existing = await this.prisma.appointment.findMany({
      where: {
        providerId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      orderBy: { startTime: 'asc' },
      select: { startTime: true, endTime: true },
    });

    const slots: AvailableSlot[] = [];
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      if (slotEnd > dayEnd) break;

      // Check if slot is within exception time range
      const isInException = exception && exception.startTime && exception.endTime
        ? this.isTimeInRange(current, exception.startTime, exception.endTime)
        : false;

      const isBooked = existing.some(
        (apt) => current < apt.endTime && slotEnd > apt.startTime,
      );

      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked && !isInException,
        providerId,
      });

      current = slotEnd;
    }

    return slots;
  }

  async getPatientFlowStatus(facilityId: string, date: string): Promise<PatientFlowStatus[]> {
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        facilityId,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        provider: { select: { firstName: true, lastName: true } },
        resource: { select: { name: true } },
      },
    });

    return appointments.map(apt => ({
      appointmentId: apt.id,
      status: apt.status,
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      providerName: `${apt.provider.firstName} ${apt.provider.lastName}`,
      scheduledTime: apt.startTime,
      checkedInAt: apt.checkedInAt,
      roomedAt: apt.roomedAt,
      providerSeenAt: apt.providerSeenAt,
      checkedOutAt: apt.checkedOutAt,
      waitTimeMinutes: apt.checkedInAt && apt.providerSeenAt
        ? Math.round((apt.providerSeenAt.getTime() - apt.checkedInAt.getTime()) / 60000)
        : apt.checkedInAt && !apt.providerSeenAt
          ? Math.round((Date.now() - apt.checkedInAt.getTime()) / 60000)
          : undefined,
      room: apt.resource?.name || null,
    }));
  }

  // Waitlist Operations
  async addToWaitlist(dto: {
    patientId: string;
    providerId?: string;
    facilityId?: string;
    appointmentTypeId?: string;
    reason?: string;
    priority?: number;
    preferredDays?: number[];
    preferredTimeOfDay?: string;
  }, addedById?: string) {
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        facilityId: dto.facilityId,
        appointmentTypeId: dto.appointmentTypeId,
        reason: dto.reason,
        priority: dto.priority || 0,
        preferredDays: dto.preferredDays ? JSON.stringify(dto.preferredDays) : null,
        preferredTimeOfDay: dto.preferredTimeOfDay,
        addedById,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    await this.auditService.log({
      action: 'WAITLIST_ADDED',
      entityType: 'WaitlistEntry',
      entityId: entry.id,
      userId: addedById,
      details: { patientId: dto.patientId },
    });

    return entry;
  }

  async getWaitlist(facilityId?: string, providerId?: string) {
    const where: any = { status: 'WAITING' };
    if (facilityId) where.facilityId = facilityId;
    if (providerId) where.providerId = providerId;

    return this.prisma.waitlistEntry.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        appointmentType: { select: { id: true, name: true } },
      },
    });
  }

  async removeFromWaitlist(id: string, reason: string, userId?: string) {
    const entry = await this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.auditService.log({
      action: 'WAITLIST_REMOVED',
      entityType: 'WaitlistEntry',
      entityId: id,
      userId,
      details: { reason },
    });

    return entry;
  }

  // Conflict Detection
  private async checkProviderConflict(providerId: string, startTime: Date, endTime: Date, excludeId?: string) {
    return this.prisma.appointment.findFirst({
      where: {
        providerId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: endTime, gte: startTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { AND: [{ startTime: { lte: startTime } }, { endTime: { gte: endTime } }] },
        ],
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });
  }

  private async checkResourceConflict(resourceId: string, startTime: Date, endTime: Date, excludeId?: string) {
    return this.prisma.appointment.findFirst({
      where: {
        resourceId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: endTime, gte: startTime } },
          { endTime: { gt: startTime, lte: endTime } },
          { AND: [{ startTime: { lte: startTime } }, { endTime: { gte: endTime } }] },
        ],
      },
    });
  }

  private async checkProviderAvailability(providerId: string, facilityId: string | undefined, startTime: Date): Promise<boolean> {
    const dayOfWeek = startTime.getDay();

    // Check for exceptions
    const exception = await this.prisma.scheduleException.findFirst({
      where: {
        providerId,
        date: {
          gte: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()),
          lt: new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1),
        },
      },
    });

    if (exception && !exception.startTime) {
      return false; // All-day exception
    }

    // Check schedule template
    const schedule = await this.prisma.providerSchedule.findFirst({
      where: {
        providerId,
        facilityId: facilityId || null,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!schedule) {
      // No schedule template - allow by default (backward compatibility)
      return true;
    }

    // Check if time is within scheduled hours
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    const scheduleStart = new Date(startTime);
    scheduleStart.setHours(startHour, startMin, 0, 0);
    const scheduleEnd = new Date(startTime);
    scheduleEnd.setHours(endHour, endMin, 0, 0);

    return startTime >= scheduleStart && startTime < scheduleEnd;
  }

  private isTimeInRange(time: Date, startTime: string, endTime: string): boolean {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const timeMinutes = time.getHours() * 60 + time.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }
}
