export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] as const;

export const PATIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'DECEASED'] as const;

export const APPOINTMENT_STATUSES = [
  'SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;

export const APPOINTMENT_TYPES = [
  'OFFICE_VISIT', 'FOLLOW_UP', 'PROCEDURE', 'TELEHEALTH', 'URGENT', 'ANNUAL_PHYSICAL',
] as const;

export const ENCOUNTER_TYPES = [
  'OFFICE_VISIT', 'TELEHEALTH', 'HOSPITAL', 'URGENT_CARE', 'PROCEDURE',
] as const;

export const ENCOUNTER_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'SIGNED'] as const;

export const ALLERGY_TYPES = ['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER'] as const;

export const ALLERGY_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'] as const;

export const CONDITION_STATUSES = ['ACTIVE', 'RESOLVED', 'CHRONIC', 'INACTIVE'] as const;

export const MEDICATION_STATUSES = ['ACTIVE', 'DISCONTINUED', 'COMPLETED', 'ON_HOLD'] as const;

export const LAB_ORDER_STATUSES = ['ORDERED', 'COLLECTED', 'IN_PROGRESS', 'RESULTED', 'REVIEWED', 'CANCELLED'] as const;

export const LAB_PRIORITIES = ['ROUTINE', 'STAT', 'URGENT'] as const;

export const CLAIM_STATUSES = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID', 'DENIED'] as const;

export const REFERRAL_URGENCIES = ['ROUTINE', 'URGENT', 'STAT'] as const;

export const REFERRAL_STATUSES = ['PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED'] as const;

export const DEA_SCHEDULES = ['I', 'II', 'III', 'IV', 'V'] as const;

export const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'DOMESTIC_PARTNER'] as const;

export const EMPLOYMENT_STATUSES = ['EMPLOYED', 'UNEMPLOYED', 'RETIRED', 'STUDENT', 'DISABLED', 'SELF_EMPLOYED'] as const;

export const USER_ROLES = ['admin', 'provider', 'staff', 'patient', 'billing'] as const;

export const VITAL_UNITS = {
  temperature: { fahrenheit: '°F', celsius: '°C' },
  height: { inches: 'in', centimeters: 'cm' },
  weight: { pounds: 'lb', kilograms: 'kg' },
} as const;
