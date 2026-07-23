import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class FhirService {
  constructor(private readonly prisma: PrismaService) {}

  async getPatient(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException(`Patient/${id} not found`);
    return this.mapPatient(patient);
  }

  async searchPatients(params: { name?: string; birthDate?: string; gender?: string; _count?: number }) {
    const where: any = { deletedAt: null };
    if (params.name) {
      where.OR = [
        { firstName: { contains: params.name, mode: 'insensitive' } },
        { lastName: { contains: params.name, mode: 'insensitive' } },
      ];
    }
    if (params.birthDate) where.dateOfBirth = params.birthDate;
    if (params.gender) where.gender = params.gender.toUpperCase();

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({ where, take: params._count || 20 }),
      this.prisma.patient.count({ where }),
    ]);

    return this.createBundle(patients.map((p) => this.mapPatient(p)), total);
  }

  async getEncounter(id: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id } });
    if (!encounter) throw new NotFoundException(`Encounter/${id} not found`);
    return this.mapEncounter(encounter);
  }

  async getPatientEncounters(patientId: string) {
    const encounters = await this.prisma.encounter.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return this.createBundle(encounters.map((e) => this.mapEncounter(e)), encounters.length);
  }

  async getObservations(patientId: string, category?: string) {
    const vitals = await this.prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    const observations = vitals.flatMap((v) => this.mapVitals(v));
    return this.createBundle(observations, observations.length);
  }

  async getConditions(patientId: string) {
    const conditions = await this.prisma.condition.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return this.createBundle(conditions.map((c) => this.mapCondition(c)), conditions.length);
  }

  async getAllergies(patientId: string) {
    const allergies = await this.prisma.allergy.findMany({
      where: { patientId, deletedAt: null },
    });
    return this.createBundle(allergies.map((a) => this.mapAllergy(a)), allergies.length);
  }

  async getMedications(patientId: string) {
    const meds = await this.prisma.medication.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    return this.createBundle(meds.map((m) => this.mapMedication(m)), meds.length);
  }

  async getImmunizations(patientId: string) {
    const immunizations = await this.prisma.immunization.findMany({
      where: { patientId },
      orderBy: { administeredAt: 'desc' },
    });
    return this.createBundle(immunizations.map((i) => this.mapImmunization(i)), immunizations.length);
  }

  async getCapabilityStatement() {
    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      implementation: { description: 'CareForge EHR FHIR R4 Server' },
      rest: [{
        mode: 'server',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Observation', interaction: [{ code: 'search-type' }] },
          { type: 'Condition', interaction: [{ code: 'search-type' }] },
          { type: 'AllergyIntolerance', interaction: [{ code: 'search-type' }] },
          { type: 'MedicationRequest', interaction: [{ code: 'search-type' }] },
          { type: 'Immunization', interaction: [{ code: 'search-type' }] },
        ],
      }],
    };
  }

  // --- Private Mappers ---

  private createBundle(resources: any[], total: number) {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: resources.map((r) => ({
        fullUrl: `urn:uuid:${r.id}`,
        resource: r,
        search: { mode: 'match' },
      })),
    };
  }

  private mapPatient(p: any) {
    return {
      resourceType: 'Patient',
      id: p.id,
      meta: { lastUpdated: p.updatedAt },
      identifier: [
        { system: 'urn:careforge:mrn', value: p.medicalRecordNumber },
        ...(p.ssn ? [{ system: 'http://hl7.org/fhir/sid/us-ssn', value: p.ssn }] : []),
      ],
      active: p.status === 'ACTIVE',
      name: [{ use: 'official', family: p.lastName, given: [p.firstName, p.middleName].filter(Boolean) }],
      gender: (p.gender?.toLowerCase() || 'unknown'),
      birthDate: p.dateOfBirth,
      address: p.address ? [{ line: [p.address], city: p.city, state: p.state, postalCode: p.zipCode, country: 'US' }] : [],
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone }] : []),
        ...(p.email ? [{ system: 'email', value: p.email }] : []),
      ],
    };
  }

  private mapEncounter(e: any) {
    const statusMap: Record<string, string> = { IN_PROGRESS: 'in-progress', COMPLETED: 'finished', SIGNED: 'finished', CANCELLED: 'cancelled' };
    return {
      resourceType: 'Encounter',
      id: e.id,
      status: statusMap[e.status] || 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: e.type === 'TELEHEALTH' ? 'VR' : 'AMB' },
      subject: { reference: `Patient/${e.patientId}` },
      period: { start: e.createdAt },
      reasonCode: e.chiefComplaint ? [{ text: e.chiefComplaint }] : undefined,
    };
  }

  private mapVitals(v: any) {
    const codes: Record<string, { code: string; display: string; unit: string }> = {
      systolicBP: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]' },
      diastolicBP: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mm[Hg]' },
      heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min' },
      temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
      respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
      oxygenSaturation: { code: '2708-6', display: 'Oxygen saturation', unit: '%' },
      weight: { code: '29463-7', display: 'Body weight', unit: 'kg' },
      height: { code: '8302-2', display: 'Body height', unit: 'cm' },
    };
    const obs: any[] = [];
    for (const [key, cfg] of Object.entries(codes)) {
      if (v[key] != null) {
        obs.push({
          resourceType: 'Observation',
          id: `${v.id}-${key}`,
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: { coding: [{ system: 'http://loinc.org', code: cfg.code, display: cfg.display }] },
          subject: { reference: `Patient/${v.patientId}` },
          effectiveDateTime: v.recordedAt || v.createdAt,
          valueQuantity: { value: v[key], unit: cfg.unit, system: 'http://unitsofmeasure.org' },
        });
      }
    }
    return obs;
  }

  private mapCondition(c: any) {
    return {
      resourceType: 'Condition',
      id: c.id,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: c.status === 'RESOLVED' ? 'resolved' : 'active' }] },
      code: { coding: c.icd10Code ? [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: c.icd10Code, display: c.name }] : [], text: c.name },
      subject: { reference: `Patient/${c.patientId}` },
      onsetDateTime: c.onsetDate || undefined,
      recordedDate: c.createdAt,
    };
  }

  private mapAllergy(a: any) {
    return {
      resourceType: 'AllergyIntolerance',
      id: a.id,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: a.status === 'RESOLVED' ? 'resolved' : 'active' }] },
      code: { text: a.allergen },
      patient: { reference: `Patient/${a.patientId}` },
      recordedDate: a.createdAt,
    };
  }

  private mapMedication(m: any) {
    return {
      resourceType: 'MedicationRequest',
      id: m.id,
      status: m.status === 'ACTIVE' ? 'active' : m.status === 'DISCONTINUED' ? 'stopped' : 'completed',
      intent: 'order',
      medicationCodeableConcept: { coding: m.rxnormCode ? [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: m.rxnormCode, display: m.name }] : [], text: m.name },
      subject: { reference: `Patient/${m.patientId}` },
      authoredOn: m.startDate || m.createdAt,
    };
  }

  private mapImmunization(i: any) {
    return {
      resourceType: 'Immunization',
      id: i.id,
      status: 'completed',
      vaccineCode: { coding: i.cvxCode ? [{ system: 'http://hl7.org/fhir/sid/cvx', code: i.cvxCode, display: i.vaccineName }] : [], text: i.vaccineName },
      patient: { reference: `Patient/${i.patientId}` },
      occurrenceDateTime: i.administeredAt || i.createdAt,
      lotNumber: i.lotNumber || undefined,
    };
  }
}
