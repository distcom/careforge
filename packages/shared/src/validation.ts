import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  role: z.enum(['admin', 'provider', 'staff', 'patient']).optional(),
});

export const patientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
  ssn: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  preferredLanguage: z.string().optional(),
  maritalStatus: z.string().optional(),
  employmentStatus: z.string().optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DECEASED']).default('ACTIVE'),
  facilityId: z.string().optional(),
  notes: z.string().optional(),
});

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  providerId: z.string().min(1, 'Provider is required'),
  facilityId: z.string().optional(),
  type: z.string().default('OFFICE_VISIT'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const encounterSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  facilityId: z.string().optional(),
  type: z.string().default('OFFICE_VISIT'),
  chiefComplaint: z.string().optional(),
  hpi: z.string().optional(),
  ros: z.string().optional(),
  physicalExam: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  instructions: z.string().optional(),
});

export const vitalSignSchema = z.object({
  systolic: z.number().min(50).max(300).optional(),
  diastolic: z.number().min(30).max(200).optional(),
  heartRate: z.number().min(20).max(300).optional(),
  temperature: z.number().min(90).max(110).optional(),
  tempUnit: z.enum(['F', 'C']).default('F'),
  respiratoryRate: z.number().min(5).max(80).optional(),
  oxygenSat: z.number().min(50).max(100).optional(),
  height: z.number().min(10).max(300).optional(),
  weight: z.number().min(1).max(700).optional(),
  painScale: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export const allergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  allergenType: z.enum(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER']),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});

export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

export const prescriptionSchema = z.object({
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  route: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.string().optional(),
  refills: z.number().min(0).max(12).default(0),
  instructions: z.string().optional(),
  deaSchedule: z.enum(['I', 'II', 'III', 'IV', 'V']).optional(),
  pharmacyName: z.string().optional(),
  pharmacyPhone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type EncounterInput = z.infer<typeof encounterSchema>;
export type VitalSignInput = z.infer<typeof vitalSignSchema>;
export type AllergyInput = z.infer<typeof allergySchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
