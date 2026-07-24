import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CCdaGenerator, PatientData, ProviderData, EncounterData,
  MedicationData, AllergyData, VitalSignData, ProcedureData,
  LabResultData, ImmunizationData, CarePlanData, DiagnosisData,
} from './c-cda.generator';

@Injectable()
export class CCdaService {
  private readonly logger = new Logger(CCdaService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private generator: CCdaGenerator,
  ) {}

  async generateCCD(patientId: string, userId?: string): Promise<{ xml: string; documentId: string }> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        encounters: {
          include: { provider: true },
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        conditions: { where: { status: 'ACTIVE' } },
        allergies: true,
        medications: { where: { status: { in: ['ACTIVE', 'DRAFT'] } } },
        immunizations: { orderBy: { administeredDate: 'desc' }, take: 20 },
        carePlans: { where: { status: 'ACTIVE' } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const patientData: PatientData = {
      mrn: patient.medicalRecordNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName || undefined,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender || 'unknown',
      ssn: patient.ssn || undefined,
      address: patient.address || undefined,
      city: patient.city || undefined,
      state: patient.state || undefined,
      zipCode: patient.zipCode || undefined,
      phone: patient.phone || undefined,
    };

    const providerData: ProviderData = {
      npi: patient.encounters[0]?.provider?.npi || '1234567890',
      name: patient.encounters[0]?.provider ? `${patient.encounters[0].provider.firstName} ${patient.encounters[0].provider.lastName}` : 'CareForge Provider',
      organization: 'CareForge Medical Group',
      address: '123 Medical Center Dr, Healthcare City, CA 90210',
      phone: '555-123-4567',
    };

    const encounters: EncounterData[] = patient.encounters.map((e) => ({
      id: e.id,
      type: e.type || 'office',
      date: e.startTime,
      reason: e.chiefComplaint || undefined,
      diagnoses: [],
      provider: {
        npi: e.provider?.npi || '1234567890',
        name: e.provider ? `${e.provider.firstName} ${e.provider.lastName}` : 'Provider',
        organization: 'CareForge Medical Group',
      },
    }));

    const medications: MedicationData[] = patient.medications.map((m) => ({
      name: m.medicationName,
      code: m.ndcCode || undefined,
      dose: m.dosage || undefined,
      route: m.route || undefined,
      frequency: m.frequency || undefined,
      startDate: m.startDate || undefined,
      endDate: m.endDate || undefined,
      status: m.status.toLowerCase(),
    }));

    const allergies: AllergyData[] = patient.allergies.map((a) => ({
      substance: a.substance,
      code: a.substanceCode || undefined,
      reaction: a.reaction || 'Unknown',
      severity: a.severity || 'moderate',
      status: a.status || 'active',
    }));

    const immunizations: ImmunizationData[] = patient.immunizations.map((i) => ({
      name: i.vaccineName,
      code: i.cvxCode || '00',
      date: i.administeredDate,
      lotNumber: i.lotNumber || undefined,
      route: i.route || undefined,
    }));

    const carePlans: CarePlanData[] = patient.carePlans.map((cp) => ({
      title: cp.title,
      status: cp.status.toLowerCase(),
      startDate: cp.startDate,
      goals: [],
      interventions: [],
    }));

    const xml = this.generator.generateCCD(patientData, providerData, {
      encounters,
      medications,
      allergies,
      vitals: [],
      procedures: [],
      labResults: [],
      immunizations,
      carePlans,
    });

    const documentId = `CCD-${Date.now()}`;

    await this.auditService.log({
      action: 'CCDA_CCD_GENERATED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
      details: { documentId, sections: ['allergies', 'medications', 'problems', 'immunizations', 'carePlans', 'encounters'] },
    });

    return { xml, documentId };
  }

  async generateDischargeSummary(
    patientId: string,
    encounterId: string,
    dischargeInstructions: string,
    userId?: string,
  ): Promise<{ xml: string; documentId: string }> {
    const [patient, encounter] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: patientId } }),
      this.prisma.encounter.findUnique({
        where: { id: encounterId },
        include: { provider: true },
      }),
    ]);

    if (!patient) throw new NotFoundException('Patient not found');
    if (!encounter) throw new NotFoundException('Encounter not found');

    const patientData: PatientData = {
      mrn: patient.medicalRecordNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender || 'unknown',
    };

    const providerData: ProviderData = {
      npi: encounter.provider?.npi || '1234567890',
      name: encounter.provider ? `${encounter.provider.firstName} ${encounter.provider.lastName}` : 'Provider',
      organization: 'CareForge Medical Group',
    };

    const xml = this.generator.generateDischargeSummary(
      patientData,
      providerData,
      encounter.startTime,
      encounter.endTime || new Date().toISOString(),
      '01', // Discharged to home
      {
        admissionDiagnosis: [],
        dischargeDiagnosis: [],
        procedures: [],
        medications: [],
        dischargeInstructions,
      },
    );

    const documentId = `DS-${Date.now()}`;

    await this.auditService.log({
      action: 'CCDA_DISCHARGE_SUMMARY_GENERATED',
      entityType: 'Encounter',
      entityId: encounterId,
      userId,
      details: { documentId, patientId },
    });

    return { xml, documentId };
  }

  async generateReferralSummary(patientId: string, referralId: string, userId?: string): Promise<{ xml: string; documentId: string }> {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const patientData: PatientData = {
      mrn: patient.medicalRecordNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender || 'unknown',
    };

    const providerData: ProviderData = {
      npi: '1234567890',
      name: 'Referring Provider',
      organization: 'CareForge Medical Group',
    };

    // Generate a basic CCD for referral
    const xml = this.generator.generateCCD(patientData, providerData, {
      encounters: [],
      medications: [],
      allergies: [],
      vitals: [],
      procedures: [],
      labResults: [],
      immunizations: [],
      carePlans: [],
    });

    const documentId = `REF-${Date.now()}`;

    await this.auditService.log({
      action: 'CCDA_REFERRAL_SUMMARY_GENERATED',
      entityType: 'Referral',
      entityId: referralId,
      userId,
      details: { documentId, patientId },
    });

    return { xml, documentId };
  }

  async listGeneratedDocuments(patientId: string, userId?: string): Promise<any[]> {
    // In a production system, this would query a document repository
    // For now, return empty as documents are generated on-demand
    await this.auditService.log({
      action: 'CCDA_DOCUMENTS_LISTED',
      entityType: 'Patient',
      entityId: patientId,
      userId,
    });

    return [];
  }
}
