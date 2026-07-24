import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface UpdateProfileDto {
  phone?: string;
  mobilePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RequestAppointmentDto {
  providerId: string;
  preferredDate: string;
  preferredTime?: string;
  reason: string;
  appointmentType?: string;
}

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Dashboard
  async getPatientDashboard(patientId: string, userId?: string) {
    const [
      appointments,
      labOrders,
      medications,
      messages,
      careGaps,
      activeAlerts,
    ] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { patientId, status: { in: ['SCHEDULED', 'CONFIRMED', 'ARRIVED'] } },
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
      this.prisma.careGap.findMany({
        where: { patientId, status: 'OPEN' },
        take: 5,
      }),
      this.prisma.clinicalAlert.findMany({
        where: { patientId, status: 'ACTIVE' },
        take: 5,
      }),
    ]);

    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_DASHBOARD_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'dashboard' },
      });
    }

    return {
      upcomingAppointments: appointments,
      recentLabResults: labOrders,
      activeMedications: medications,
      recentMessages: messages,
      openCareGaps: careGaps,
      activeAlerts: activeAlerts,
    };
  }

  // Profile Management
  async getProfile(patientId: string, userId?: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        contacts: { where: { isPrimary: true } },
        insurances: { where: { isActive: true }, include: { insurancePlan: { include: { company: true } } } },
        facility: { select: { name: true, phone: true } },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_PROFILE_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'profile' },
      });
    }

    return patient;
  }

  async updateProfile(patientId: string, dto: UpdateProfileDto, userId?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const updated = await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        phone: dto.phone,
        mobilePhone: dto.mobilePhone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        preferredLanguage: dto.preferredLanguage,
      },
    });

    await this.auditService.log({
      action: 'PORTAL_PROFILE_UPDATED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { changes: Object.keys(dto).filter((k) => dto[k as keyof UpdateProfileDto] !== undefined) },
    });

    return updated;
  }

  // Appointments
  async getAppointments(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { startTime: 'desc' },
        include: {
          provider: { select: { firstName: true, lastName: true } },
          facility: { select: { name: true, address: true, phone: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return new PaginatedResult(appointments, total, query.page, query.limit);
  }

  async requestAppointment(patientId: string, dto: RequestAppointmentDto, userId?: string) {
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId,
        providerId: dto.providerId,
        startTime: new Date(dto.preferredDate),
        endTime: new Date(new Date(dto.preferredDate).getTime() + 30 * 60000),
        reason: dto.reason,
        status: 'REQUESTED',
        type: dto.appointmentType || 'OFFICE_VISIT',
      },
    });

    await this.auditService.log({
      action: 'PORTAL_APPOINTMENT_REQUESTED',
      entityType: 'Appointment',
      entityId: appointment.id,
      userId,
      details: { patientId, providerId: dto.providerId, preferredDate: dto.preferredDate },
    });

    return appointment;
  }

  async cancelAppointment(patientId: string, appointmentId: string, reason?: string, userId?: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patientId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (!['SCHEDULED', 'CONFIRMED', 'REQUESTED'].includes(appointment.status)) {
      throw new BadRequestException('Cannot cancel this appointment');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED', statusReason: reason },
    });

    await this.auditService.log({
      action: 'PORTAL_APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appointmentId,
      userId,
      details: { patientId, reason },
    });

    return updated;
  }

  // Health Records
  async getConditions(patientId: string, userId?: string) {
    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_RECORDS_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'conditions' },
      });
    }
    return this.prisma.condition.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { diagnosedAt: 'desc' },
    });
  }

  async getMedications(patientId: string, userId?: string) {
    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_RECORDS_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'medications' },
      });
    }
    return this.prisma.medication.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
  }

  async getAllergies(patientId: string, userId?: string) {
    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_RECORDS_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'allergies' },
      });
    }
    return this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getImmunizations(patientId: string, userId?: string) {
    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_RECORDS_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'immunizations' },
      });
    }
    return this.prisma.immunization.findMany({
      where: { patientId },
      orderBy: { administeredAt: 'desc' },
    });
  }

  async getVitals(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };
    const [vitals, total] = await Promise.all([
      this.prisma.vitalSign.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.vitalSign.count({ where }),
    ]);
    return new PaginatedResult(vitals, total, query.page, query.limit);
  }

  // Lab Results
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

  // Documents
  async getDocuments(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId, deletedAt: null, sharedWithPatient: true };
    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } } },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);
    return new PaginatedResult(documents, total, query.page, query.limit);
  }

  // Billing
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

  // Consent Management
  async getConsents(patientId: string, userId?: string) {
    if (userId) {
      await this.auditService.log({
        action: 'PORTAL_CONSENT_ACCESSED',
        entityType: 'Patient',
        entityId: patientId,
        userId,
        details: { section: 'consents' },
      });
    }
    return this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async signConsent(patientId: string, consentId: string, userId?: string) {
    const consent = await this.prisma.consent.findFirst({
      where: { id: consentId, patientId },
    });
    if (!consent) throw new NotFoundException('Consent not found');

    if (consent.status !== 'PENDING') {
      throw new BadRequestException('Consent is not pending');
    }

    const updated = await this.prisma.consent.update({
      where: { id: consentId },
      data: {
        status: 'GRANTED',
        grantedAt: new Date(),
        signedById: userId,
        signedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'PORTAL_CONSENT_SIGNED',
      entityType: 'Consent',
      entityId: consentId,
      userId,
      details: { patientId, consentType: consent.consentType },
    });

    return updated;
  }
}
