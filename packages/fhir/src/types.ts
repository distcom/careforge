/**
 * FHIR R4 Resource Types for CareForge EHR
 * Subset of HL7 FHIR R4 resources used in this system
 */

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  text?: FhirNarrative;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  profile?: string[];
}

export interface FhirNarrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string;
}

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  display?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  system?: string;
  value?: string;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'maiden';
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old';
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'url';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'mobile';
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

// --- Patient Resource ---
export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  telecom?: FhirContactPoint[];
  maritalStatus?: FhirCodeableConcept;
  communication?: Array<{
    language: FhirCodeableConcept;
    preferred?: boolean;
  }>;
}

// --- Encounter Resource ---
export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: FhirCoding;
  type?: FhirCodeableConcept[];
  subject?: FhirReference;
  participant?: Array<{
    individual?: FhirReference;
  }>;
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
}

// --- Observation Resource (Vitals, Lab Results) ---
export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  valueCodeableConcept?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: Array<{
    low?: FhirQuantity;
    high?: FhirQuantity;
    text?: string;
  }>;
  component?: Array<{
    code: FhirCodeableConcept;
    valueQuantity?: FhirQuantity;
  }>;
}

// --- Condition Resource ---
export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  severity?: FhirCodeableConcept;
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  abatementDateTime?: string;
  recordedDate?: string;
}

// --- AllergyIntolerance Resource ---
export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FhirCodeableConcept;
  patient: FhirReference;
  recordedDate?: string;
  reaction?: Array<{
    manifestation: FhirCodeableConcept[];
    severity?: 'mild' | 'moderate' | 'severe';
  }>;
}

// --- MedicationRequest Resource ---
export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft';
  intent: 'order' | 'plan' | 'proposal';
  medicationCodeableConcept?: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  dosageInstruction?: Array<{
    text?: string;
    timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } };
    route?: FhirCodeableConcept;
  }>;
  dispenseRequest?: {
    numberOfRepeatsAllowed?: number;
    quantity?: FhirQuantity;
  };
}

// --- Immunization Resource ---
export interface FhirImmunization extends FhirResource {
  resourceType: 'Immunization';
  status: 'completed' | 'entered-in-error' | 'not-done';
  vaccineCode: FhirCodeableConcept;
  patient: FhirReference;
  occurrenceDateTime?: string;
  lotNumber?: string;
  site?: FhirCodeableConcept;
  route?: FhirCodeableConcept;
}

// --- Bundle Resource ---
export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: 'searchset' | 'collection' | 'document' | 'transaction';
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource?: FhirResource;
    search?: { mode?: 'match' | 'include' };
  }>;
}

// --- OperationOutcome ---
export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    diagnostics?: string;
  }>;
}

// FHIR Systems constants
export const FHIR_SYSTEMS = {
  ICD10: 'http://hl7.org/fhir/sid/icd-10-cm',
  CPT: 'http://www.ama-assn.org/go/cpt',
  LOINC: 'http://loinc.org',
  SNOMED: 'http://snomed.info/sct',
  RXNORM: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  CVX: 'http://hl7.org/fhir/sid/cvx',
  NDC: 'http://hl7.org/fhir/sid/ndc',
  UCUM: 'http://unitsofmeasure.org',
} as const;
