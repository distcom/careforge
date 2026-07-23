/**
 * FHIR R4 Mappers - Convert internal entities to FHIR resources
 */
import {
  FhirPatient,
  FhirEncounter,
  FhirObservation,
  FhirCondition,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirImmunization,
  FhirBundle,
  FHIR_SYSTEMS,
} from './types';

export function mapPatientToFhir(patient: any): FhirPatient {
  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: { lastUpdated: patient.updatedAt },
    identifier: [
      { system: 'urn:careforge:mrn', value: patient.medicalRecordNumber },
      ...(patient.ssn ? [{ system: 'http://hl7.org/fhir/sid/us-ssn', value: patient.ssn }] : []),
    ],
    active: patient.status === 'ACTIVE',
    name: [{
      use: 'official',
      family: patient.lastName,
      given: [patient.firstName, patient.middleName].filter(Boolean),
    }],
    gender: (patient.gender?.toLowerCase() || 'unknown') as FhirPatient['gender'],
    birthDate: patient.dateOfBirth,
    address: patient.address ? [{
      line: [patient.address],
      city: patient.city,
      state: patient.state,
      postalCode: patient.zipCode,
      country: 'US',
    }] : [],
    telecom: [
      ...(patient.phone ? [{ system: 'phone' as const, value: patient.phone }] : []),
      ...(patient.email ? [{ system: 'email' as const, value: patient.email }] : []),
    ],
    communication: patient.preferredLanguage ? [{
      language: { text: patient.preferredLanguage },
      preferred: true,
    }] : undefined,
  };
}

export function mapEncounterToFhir(encounter: any): FhirEncounter {
  const statusMap: Record<string, string> = {
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'finished',
    SIGNED: 'finished',
    CANCELLED: 'cancelled',
  };

  return {
    resourceType: 'Encounter',
    id: encounter.id,
    meta: { lastUpdated: encounter.updatedAt },
    status: (statusMap[encounter.status] || 'finished') as FhirEncounter['status'],
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounter.type === 'TELEHEALTH' ? 'VR' : 'AMB',
      display: encounter.type === 'TELEHEALTH' ? 'virtual' : 'ambulatory',
    },
    type: encounter.type ? [{ text: encounter.type }] : undefined,
    subject: { reference: `Patient/${encounter.patientId}` },
    participant: encounter.providerId ? [{ individual: { reference: `Practitioner/${encounter.providerId}` } }] : [],
    period: { start: encounter.createdAt },
    reasonCode: encounter.chiefComplaint ? [{ text: encounter.chiefComplaint }] : undefined,
  };
}

export function mapVitalToFhir(vital: any, patientId: string): FhirObservation {
  const vitalCodes: Record<string, { code: string; display: string; unit: string }> = {
    systolicBP: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]' },
    diastolicBP: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mm[Hg]' },
    heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min' },
    temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
    respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
    oxygenSaturation: { code: '2708-6', display: 'Oxygen saturation', unit: '%' },
    weight: { code: '29463-7', display: 'Body weight', unit: 'kg' },
    height: { code: '8302-2', display: 'Body height', unit: 'cm' },
    bmi: { code: '39156-5', display: 'Body mass index', unit: 'kg/m2' },
  };

  const observations: FhirObservation[] = [];

  for (const [key, config] of Object.entries(vitalCodes)) {
    const value = vital[key];
    if (value != null) {
      observations.push({
        resourceType: 'Observation',
        id: `${vital.id}-${key}`,
        status: 'final',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
        code: { coding: [{ system: FHIR_SYSTEMS.LOINC, code: config.code, display: config.display }] },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: vital.recordedAt || vital.createdAt,
        valueQuantity: { value, unit: config.unit, system: FHIR_SYSTEMS.UCUM },
      });
    }
  }

  return observations[0] || {
    resourceType: 'Observation',
    id: vital.id,
    status: 'final',
    code: { text: 'Vital signs' },
    subject: { reference: `Patient/${patientId}` },
  };
}

export function mapConditionToFhir(condition: any): FhirCondition {
  return {
    resourceType: 'Condition',
    id: condition.id,
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: condition.status === 'RESOLVED' ? 'resolved' : 'active',
      }],
    },
    code: {
      coding: condition.icd10Code ? [{ system: FHIR_SYSTEMS.ICD10, code: condition.icd10Code, display: condition.name }] : [],
      text: condition.name,
    },
    subject: { reference: `Patient/${condition.patientId}` },
    onsetDateTime: condition.onsetDate || undefined,
    abatementDateTime: condition.resolvedDate || undefined,
    recordedDate: condition.createdAt,
  };
}

export function mapAllergyToFhir(allergy: any): FhirAllergyIntolerance {
  return {
    resourceType: 'AllergyIntolerance',
    id: allergy.id,
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: allergy.status === 'RESOLVED' ? 'resolved' : 'active',
      }],
    },
    type: allergy.type === 'INTOLERANCE' ? 'intolerance' : 'allergy',
    category: allergy.category ? [allergy.category.toLowerCase()] : undefined,
    criticality: allergy.severity === 'SEVERE' ? 'high' : 'low',
    code: { text: allergy.allergen },
    patient: { reference: `Patient/${allergy.patientId}` },
    recordedDate: allergy.createdAt,
    reaction: allergy.reaction ? [{
      manifestation: [{ text: allergy.reaction }],
      severity: allergy.severity?.toLowerCase() as any,
    }] : undefined,
  };
}

export function mapMedicationToFhir(med: any): FhirMedicationRequest {
  return {
    resourceType: 'MedicationRequest',
    id: med.id,
    status: med.status === 'ACTIVE' ? 'active' : med.status === 'DISCONTINUED' ? 'stopped' : 'completed',
    intent: 'order',
    medicationCodeableConcept: {
      coding: med.rxnormCode ? [{ system: FHIR_SYSTEMS.RXNORM, code: med.rxnormCode, display: med.name }] : [],
      text: med.name,
    },
    subject: { reference: `Patient/${med.patientId}` },
    authoredOn: med.startDate || med.createdAt,
    dosageInstruction: med.dosage ? [{ text: `${med.dosage} ${med.frequency || ''}`.trim() }] : undefined,
    dispenseRequest: med.refillsAllowed != null ? { numberOfRepeatsAllowed: med.refillsAllowed } : undefined,
  };
}

export function mapImmunizationToFhir(imm: any): FhirImmunization {
  return {
    resourceType: 'Immunization',
    id: imm.id,
    status: 'completed',
    vaccineCode: {
      coding: imm.cvxCode ? [{ system: FHIR_SYSTEMS.CVX, code: imm.cvxCode, display: imm.vaccineName }] : [],
      text: imm.vaccineName,
    },
    patient: { reference: `Patient/${imm.patientId}` },
    occurrenceDateTime: imm.administeredDate || imm.createdAt,
    lotNumber: imm.lotNumber || undefined,
    site: imm.site ? { text: imm.site } : undefined,
    route: imm.route ? { text: imm.route } : undefined,
  };
}

export function createSearchBundle(resources: any[], total: number): FhirBundle {
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
