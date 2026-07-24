import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateAlertDto {
  patientId: string;
  alertType: string;
  severity?: string;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface CreateCareGapDto {
  patientId: string;
  gapType: string;
  measure: string;
  dueDate?: string;
  notes?: string;
}

@Injectable()
export class ClinicalDecisionSupportService {
  private readonly logger = new Logger(ClinicalDecisionSupportService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Alert management
  async getPatientAlerts(patientId: string, query: PaginationQuery & { status?: string; alertType?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;
    if (query.alertType) where.alertType = query.alertType;

    const [alerts, total] = await Promise.all([
      this.prisma.clinicalAlert.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          acknowledgedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.clinicalAlert.count({ where }),
    ]);
    return new PaginatedResult(alerts, total, query.page, query.limit);
  }

  async getActiveAlerts(patientId: string) {
    return this.prisma.clinicalAlert.findMany({
      where: { patientId, status: 'ACTIVE' },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAlert(dto: CreateAlertDto, userId?: string) {
    const alert = await this.prisma.clinicalAlert.create({
      data: {
        patientId: dto.patientId,
        alertType: dto.alertType,
        severity: dto.severity || 'INFO',
        title: dto.title,
        message: dto.message,
        relatedEntityId: dto.relatedEntityId,
        relatedEntityType: dto.relatedEntityType,
      },
    });

    await this.auditService.log({
      action: 'CLINICAL_ALERT_CREATED',
      entityType: 'ClinicalAlert',
      entityId: alert.id,
      userId,
      details: {
        patientId: dto.patientId,
        alertType: dto.alertType,
        severity: dto.severity,
      },
    });

    // Log critical alerts separately
    if (dto.severity === 'CRITICAL') {
      this.logger.warn(`Critical alert created for patient ${dto.patientId}: ${dto.title}`);
    }

    return alert;
  }

  async acknowledgeAlert(id: string, userId?: string) {
    const alert = await this.prisma.clinicalAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');

    const updated = await this.prisma.clinicalAlert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'CLINICAL_ALERT_ACKNOWLEDGED',
      entityType: 'ClinicalAlert',
      entityId: id,
      userId,
      details: { patientId: alert.patientId, alertType: alert.alertType },
    });

    return updated;
  }

  async dismissAlert(id: string, reason: string, userId?: string) {
    const alert = await this.prisma.clinicalAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');

    const updated = await this.prisma.clinicalAlert.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        dismissedReason: reason,
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'CLINICAL_ALERT_DISMISSED',
      entityType: 'ClinicalAlert',
      entityId: id,
      userId,
      details: { patientId: alert.patientId, alertType: alert.alertType, reason },
    });

    return updated;
  }

  // Care gap management
  async getPatientCareGaps(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;

    const [gaps, total] = await Promise.all([
      this.prisma.careGap.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.careGap.count({ where }),
    ]);
    return new PaginatedResult(gaps, total, query.page, query.limit);
  }

  async getOpenCareGaps(patientId: string) {
    return this.prisma.careGap.findMany({
      where: { patientId, status: 'OPEN' },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createCareGap(dto: CreateCareGapDto, userId?: string) {
    const gap = await this.prisma.careGap.create({
      data: {
        patientId: dto.patientId,
        gapType: dto.gapType,
        measure: dto.measure,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'CARE_GAP_CREATED',
      entityType: 'CareGap',
      entityId: gap.id,
      userId,
      details: {
        patientId: dto.patientId,
        gapType: dto.gapType,
        measure: dto.measure,
      },
    });

    return gap;
  }

  async closeCareGap(id: string, reason?: string, userId?: string) {
    const gap = await this.prisma.careGap.findUnique({ where: { id } });
    if (!gap) throw new NotFoundException('Care gap not found');

    const updated = await this.prisma.careGap.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedReason: reason,
      },
    });

    await this.auditService.log({
      action: 'CARE_GAP_CLOSED',
      entityType: 'CareGap',
      entityId: id,
      userId,
      details: { patientId: gap.patientId, measure: gap.measure, reason },
    });

    return updated;
  }

  // Preventive care checks
  async checkPreventiveCare(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        immunizations: { orderBy: { administeredAt: 'desc' } },
        conditions: { where: { status: 'ACTIVE' } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const gaps: CreateCareGapDto[] = [];
    const now = new Date();
    const age = Math.floor((now.getTime() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    // Check flu vaccination (annual)
    const lastFluShot = patient.immunizations.find(
      (i) => i.vaccineName?.toLowerCase().includes('flu') || i.cvxCode === '88'
    );
    if (!lastFluShot || lastFluShot.administeredAt < new Date(now.getFullYear(), 8, 1)) {
      gaps.push({
        patientId,
        gapType: 'IMMUNIZATION_DUE',
        measure: 'Annual Influenza Vaccination',
        dueDate: new Date(now.getFullYear(), 9, 1).toISOString(),
      });
    }

    // Check pneumonia vaccination for 65+
    if (age >= 65) {
      const pneumoniaVaccine = patient.immunizations.find(
        (i) => i.vaccineName?.toLowerCase().includes('pneumonia') || ['133', '109'].includes(i.cvxCode || '')
      );
      if (!pneumoniaVaccine) {
        gaps.push({
          patientId,
          gapType: 'IMMUNIZATION_DUE',
          measure: 'Pneumococcal Vaccination (65+)',
        });
      }
    }

    // Check diabetes screening for 45+ or with risk factors
    if (age >= 45) {
      const hasDiabetes = patient.conditions.some(
        (c) => c.icd10Code?.startsWith('E11') || c.icd10Code?.startsWith('E10')
      );
      if (!hasDiabetes) {
        gaps.push({
          patientId,
          gapType: 'SCREENING_DUE',
          measure: 'Diabetes Screening (45+)',
        });
      }
    }

    return { patientId, identifiedGaps: gaps, age };
  }

  // Drug interaction check (simplified)
  async checkDrugInteractions(patientId: string, newMedicationName: string) {
    const activeMeds = await this.prisma.medication.findMany({
      where: { patientId, status: 'ACTIVE' },
    });

    // Simplified interaction check - in production, use a drug database API
    const interactions: Array<{ medication: string; severity: string; description: string }> = [];

    // Example: Check for common interactions
    const medNames = activeMeds.map((m) => m.name?.toLowerCase() || '');
    const newMedLower = newMedicationName.toLowerCase();

    // Warfarin interactions
    if (newMedLower.includes('warfarin') || medNames.some((n) => n.includes('warfarin'))) {
      const interactingMeds = ['aspirin', 'ibuprofen', 'naproxen', 'amoxicillin'];
      for (const med of interactingMeds) {
        if (newMedLower.includes(med) || medNames.some((n) => n.includes(med))) {
          interactions.push({
            medication: med,
            severity: 'WARNING',
            description: `Potential interaction between warfarin and ${med}. Monitor INR closely.`,
          });
        }
      }
    }

    return { patientId, newMedication: newMedicationName, interactions, hasInteractions: interactions.length > 0 };
  }
}
