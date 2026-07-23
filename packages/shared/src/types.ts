// Core entity types shared between frontend and backend

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  facilityIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  medicalRecordNumber?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: string;
  ssn?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  preferredLanguage?: string;
  maritalStatus?: string;
  employmentStatus?: string;
  race?: string;
  ethnicity?: string;
  status: PatientStatus;
  photoUrl?: string;
  facilityId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED';

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  facilityId?: string;
  type: string;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  duration: number;
  reason?: string;
  notes?: string;
  patient?: { firstName: string; lastName: string };
  provider?: { firstName: string; lastName: string };
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Encounter {
  id: string;
  patientId: string;
  providerId: string;
  facilityId?: string;
  type: string;
  status: EncounterStatus;
  chiefComplaint?: string;
  hpi?: string;
  ros?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  instructions?: string;
  startedAt?: string;
  completedAt?: string;
  signedAt?: string;
  diagnoses?: EncounterDiagnosis[];
  procedures?: EncounterProcedure[];
}

export type EncounterStatus = 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED';

export interface EncounterDiagnosis {
  id: string;
  icd10Code: string;
  description: string;
  isPrimary: boolean;
}

export interface EncounterProcedure {
  id: string;
  cptCode: string;
  description: string;
  modifiers?: string;
  units: number;
  fee?: number;
}

export interface VitalSign {
  id: string;
  patientId: string;
  encounterId?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  tempUnit?: string;
  respiratoryRate?: number;
  oxygenSat?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  painScale?: number;
  notes?: string;
  recordedAt: string;
}

export interface Condition {
  id: string;
  patientId: string;
  icd10Code?: string;
  snomedCode?: string;
  name: string;
  description?: string;
  status: string;
  severity?: string;
  laterality?: string;
  onsetDate?: string;
  resolvedDate?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  rxnormCode?: string;
  ndcCode?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  allergenType: string;
  snomedCode?: string;
  severity?: string;
  reaction?: string;
  status: string;
  notes?: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  providerId: string;
  status: string;
  priority: string;
  clinicalInfo?: string;
  orderedAt: string;
  items: LabOrderItem[];
}

export interface LabOrderItem {
  id: string;
  loincCode?: string;
  testName: string;
  result?: string;
  resultValue?: number;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  status: string;
}

export interface Claim {
  id: string;
  patientId: string;
  claimNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  submittedAt?: string;
  items: ClaimItem[];
}

export interface ClaimItem {
  id: string;
  cptCode: string;
  description: string;
  modifiers?: string;
  units: number;
  fee: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}
