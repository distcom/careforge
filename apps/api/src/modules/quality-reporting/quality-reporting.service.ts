import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface QualityMeasureResult {
  measureId: string;
  measureName: string;
  numerator: number;
  denominator: number;
  rate: number;
  period: string;
}

export interface PublicHealthReport {
  reportType: string;
  period: string;
  data: any;
  generatedAt: Date;
}

@Injectable()
export class QualityReportingService {
  private readonly logger = new Logger(QualityReportingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Quality Measures
  async getQualityMeasures(period: string, userId?: string): Promise<QualityMeasureResult[]> {
    const measures = await Promise.all([
      this.calculateDiabetesHbA1cMeasure(period),
      this.calculateHypertensionControlMeasure(period),
      this.calculatePreventiveCareMeasure(period),
      this.calculateMedicationReconciliationMeasure(period),
      this.calculateFollowUpMeasure(period),
    ]);

    await this.auditService.log({
      action: 'QUALITY_MEASURES_GENERATED',
      entityType: 'QualityReport',
      entityId: period,
      userId,
      details: { period, measureCount: measures.length },
    });

    return measures;
  }

  private async calculateDiabetesHbA1cMeasure(period: string): Promise<QualityMeasureResult> {
    // CMS122: Diabetes: Hemoglobin A1c Poor Control
    const diabeticPatients = await this.prisma.condition.count({
      where: {
        icd10Code: { startsWith: 'E11' }, // Type 2 diabetes
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Simplified: count patients with recent lab orders
    const patientsWithLabs = await this.prisma.labOrder.count({
      where: {
        status: 'RESULTED',
        createdAt: { gte: new Date(period) },
      },
    });

    const rate = diabeticPatients > 0 ? (patientsWithLabs / diabeticPatients) * 100 : 0;

    return {
      measureId: 'CMS122v11',
      measureName: 'Diabetes: Hemoglobin A1c Poor Control',
      numerator: patientsWithLabs,
      denominator: diabeticPatients,
      rate: Math.round(rate * 10) / 10,
      period,
    };
  }

  private async calculateHypertensionControlMeasure(period: string): Promise<QualityMeasureResult> {
    // CMS165: Controlling High Blood Pressure
    const hypertensivePatients = await this.prisma.condition.count({
      where: {
        icd10Code: { startsWith: 'I10' }, // Essential hypertension
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Count patients with recent vitals
    const patientsWithVitals = await this.prisma.vitalSign.count({
      where: {
        recordedAt: { gte: new Date(period) },
      },
    });

    const rate = hypertensivePatients > 0 ? (patientsWithVitals / hypertensivePatients) * 100 : 0;

    return {
      measureId: 'CMS165v11',
      measureName: 'Controlling High Blood Pressure',
      numerator: patientsWithVitals,
      denominator: hypertensivePatients,
      rate: Math.round(rate * 10) / 10,
      period,
    };
  }

  private async calculatePreventiveCareMeasure(period: string): Promise<QualityMeasureResult> {
    // CMS125: Breast Cancer Screening
    const eligiblePatients = await this.prisma.patient.count({
      where: {
        gender: 'FEMALE',
        dateOfBirth: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 74)),
          lte: new Date(new Date().setFullYear(new Date().getFullYear() - 51)),
        },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Count patients with recent encounters
    const patientsScreened = await this.prisma.encounter.count({
      where: {
        createdAt: { gte: new Date(period) },
        deletedAt: null,
      },
    });

    const rate = eligiblePatients > 0 ? (patientsScreened / eligiblePatients) * 100 : 0;

    return {
      measureId: 'CMS125v11',
      measureName: 'Breast Cancer Screening',
      numerator: patientsScreened,
      denominator: eligiblePatients,
      rate: Math.round(rate * 10) / 10,
      period,
    };
  }

  private async calculateMedicationReconciliationMeasure(period: string): Promise<QualityMeasureResult> {
    // CMS68: Documentation of Current Medications
    const activePatients = await this.prisma.patient.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    const patientsWithMeds = await this.prisma.medication.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    const rate = activePatients > 0 ? (patientsWithMeds / activePatients) * 100 : 0;

    return {
      measureId: 'CMS68v12',
      measureName: 'Documentation of Current Medications in the Medical Record',
      numerator: patientsWithMeds,
      denominator: activePatients,
      rate: Math.round(rate * 10) / 10,
      period,
    };
  }

  private async calculateFollowUpMeasure(period: string): Promise<QualityMeasureResult> {
    // CMS128: Anti-depressant Medication Management
    const patientsWithConditions = await this.prisma.condition.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    const patientsWithFollowUp = await this.prisma.encounter.count({
      where: {
        createdAt: { gte: new Date(period) },
        deletedAt: null,
      },
    });

    const rate = patientsWithConditions > 0 ? (patientsWithFollowUp / patientsWithConditions) * 100 : 0;

    return {
      measureId: 'CMS128v11',
      measureName: 'Anti-depressant Medication Management',
      numerator: patientsWithFollowUp,
      denominator: patientsWithConditions,
      rate: Math.round(rate * 10) / 10,
      period,
    };
  }

  // Public Health Reporting
  async generatePublicHealthReport(reportType: string, period: string, userId?: string): Promise<PublicHealthReport> {
    let data: any = {};

    switch (reportType) {
      case 'IMMUNIZATION_REGISTRY':
        data = await this.generateImmunizationRegistryReport(period);
        break;
      case 'DISEASE_SURVEILLANCE':
        data = await this.generateDiseaseSurveillanceReport(period);
        break;
      case 'CANCER_REGISTRY':
        data = await this.generateCancerRegistryReport(period);
        break;
      case 'BIRTH_DEFECTS':
        data = await this.generateBirthDefectsReport(period);
        break;
      default:
        data = { error: `Unknown report type: ${reportType}` };
    }

    await this.auditService.log({
      action: 'PUBLIC_HEALTH_REPORT_GENERATED',
      entityType: 'PublicHealthReport',
      entityId: `${reportType}-${period}`,
      userId,
      details: { reportType, period },
    });

    return {
      reportType,
      period,
      data,
      generatedAt: new Date(),
    };
  }

  private async generateImmunizationRegistryReport(period: string) {
    const immunizations = await this.prisma.immunization.findMany({
      where: {
        administeredAt: { gte: new Date(period) },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    return {
      reportType: 'IIS', // Immunization Information System
      format: 'HL7_V2',
      records: immunizations.map((imm) => ({
        patient: {
          name: `${imm.patient.lastName}, ${imm.patient.firstName}`,
          dob: imm.patient.dateOfBirth,
          gender: imm.patient.gender,
          address: {
            street: imm.patient.address,
            city: imm.patient.city,
            state: imm.patient.state,
            zip: imm.patient.zipCode,
          },
        },
        vaccine: {
          name: imm.vaccineName,
          cvxCode: imm.cvxCode,
          lotNumber: imm.lotNumber,
          administeredAt: imm.administeredAt,
          site: imm.site,
          route: imm.route,
        },
      })),
      totalCount: immunizations.length,
    };
  }

  private async generateDiseaseSurveillanceReport(period: string) {
    // Reportable conditions
    const reportableConditions = await this.prisma.condition.findMany({
      where: {
        createdAt: { gte: new Date(period) },
        deletedAt: null,
        // Add specific ICD-10 codes for reportable diseases
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    return {
      reportType: 'CASE_REPORT',
      format: 'HL7_V2',
      records: reportableConditions.map((cond) => ({
        patient: {
          name: `${cond.patient.lastName}, ${cond.patient.firstName}`,
          dob: cond.patient.dateOfBirth,
          gender: cond.patient.gender,
        },
        condition: {
          name: cond.name,
          icd10Code: cond.icd10Code,
          onsetDate: cond.onsetDate,
          diagnosedAt: cond.diagnosedAt,
        },
      })),
      totalCount: reportableConditions.length,
    };
  }

  private async generateCancerRegistryReport(period: string) {
    const cancerConditions = await this.prisma.condition.findMany({
      where: {
        icd10Code: { startsWith: 'C' }, // Malignant neoplasms
        createdAt: { gte: new Date(period) },
        deletedAt: null,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    return {
      reportType: 'CANCER_REGISTRY',
      format: 'NAACCR',
      records: cancerConditions.map((cond) => ({
        patient: {
          name: `${cond.patient.lastName}, ${cond.patient.firstName}`,
          dob: cond.patient.dateOfBirth,
          gender: cond.patient.gender,
        },
        diagnosis: {
          primarySite: cond.name,
          icd10Code: cond.icd10Code,
          dateOfDiagnosis: cond.diagnosedAt,
        },
      })),
      totalCount: cancerConditions.length,
    };
  }

  private async generateBirthDefectsReport(period: string) {
    // Simplified - would need specific ICD-10 codes for birth defects
    return {
      reportType: 'BIRTH_DEFECTS',
      format: 'HL7_V2',
      records: [],
      totalCount: 0,
      note: 'Birth defects reporting requires specific ICD-10 code mapping',
    };
  }

  // eCQM Export
  async exportEcqm(measureId: string, period: string, userId?: string) {
    const measures = await this.getQualityMeasures(period, userId);
    const measure = measures.find((m) => m.measureId === measureId);

    if (!measure) {
      return { error: `Measure ${measureId} not found` };
    }

    await this.auditService.log({
      action: 'ECQM_EXPORTED',
      entityType: 'QualityMeasure',
      entityId: measureId,
      userId,
      details: { measureId, period },
    });

    return {
      measureId: measure.measureId,
      measureName: measure.measureName,
      period,
      numerator: measure.numerator,
      denominator: measure.denominator,
      rate: measure.rate,
      exportFormat: 'QRDA_CAT_III',
      exportedAt: new Date().toISOString(),
    };
  }

  // Quality Dashboard
  async getQualityDashboard(period: string, userId?: string) {
    const [measures, totalPatients, activeConditions, activeMedications] = await Promise.all([
      this.getQualityMeasures(period),
      this.prisma.patient.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.condition.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.medication.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ]);

    await this.auditService.log({
      action: 'QUALITY_DASHBOARD_ACCESSED',
      entityType: 'QualityDashboard',
      entityId: period,
      userId,
      details: { period },
    });

    return {
      period,
      summary: {
        totalPatients,
        activeConditions,
        activeMedications,
        averageQualityScore: measures.reduce((sum, m) => sum + m.rate, 0) / measures.length,
      },
      measures,
      generatedAt: new Date().toISOString(),
    };
  }
}
