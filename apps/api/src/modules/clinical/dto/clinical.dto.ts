import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Condition DTOs ---
export class CreateConditionDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Condition name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'ICD-10 code' })
  @IsOptional()
  @IsString()
  icd10Code?: string;

  @ApiPropertyOptional({ description: 'SNOMED CT code' })
  @IsOptional()
  @IsString()
  snomedCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'CHRONIC', 'IN_REMISSION'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onsetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConditionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icd10Code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'CHRONIC', 'IN_REMISSION'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Allergy DTOs ---
export class CreateAllergyDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Allergen name' })
  @IsString()
  allergen: string;

  @ApiPropertyOptional({ description: 'Allergy type' })
  @IsOptional()
  @IsEnum(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'LATEX', 'OTHER'])
  type?: string;

  @ApiPropertyOptional({ description: 'Severity' })
  @IsOptional()
  @IsEnum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'])
  severity?: string;

  @ApiPropertyOptional({ description: 'Reaction' })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onsetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAllergyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'INACTIVE'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Immunization DTOs ---
export class CreateImmunizationDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Vaccine name' })
  @IsString()
  vaccineName: string;

  @ApiPropertyOptional({ description: 'CVX code' })
  @IsOptional()
  @IsString()
  cvxCode?: string;

  @ApiPropertyOptional({ description: 'MVX code (manufacturer)' })
  @IsOptional()
  @IsString()
  mvxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  administeredDate?: string;

  @ApiPropertyOptional({ description: 'Dose number in series' })
  @IsOptional()
  @IsString()
  doseNumber?: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Administration site' })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({ description: 'Route' })
  @IsOptional()
  @IsEnum(['IM', 'SC', 'ID', 'ORAL', 'NASAL'])
  route?: string;

  @ApiPropertyOptional({ description: 'Administering provider ID' })
  @IsOptional()
  @IsUUID()
  administeredBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// --- Vitals DTOs ---
export class CreateVitalSignDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Systolic BP (mmHg)' })
  @IsOptional()
  @IsString()
  systolicBP?: string;

  @ApiPropertyOptional({ description: 'Diastolic BP (mmHg)' })
  @IsOptional()
  @IsString()
  diastolicBP?: string;

  @ApiPropertyOptional({ description: 'Heart rate (bpm)' })
  @IsOptional()
  @IsString()
  heartRate?: string;

  @ApiPropertyOptional({ description: 'Respiratory rate (breaths/min)' })
  @IsOptional()
  @IsString()
  respiratoryRate?: string;

  @ApiPropertyOptional({ description: 'Temperature (°F)' })
  @IsOptional()
  @IsString()
  temperature?: string;

  @ApiPropertyOptional({ description: 'Oxygen saturation (%)' })
  @IsOptional()
  @IsString()
  oxygenSaturation?: string;

  @ApiPropertyOptional({ description: 'Weight (kg)' })
  @IsOptional()
  @IsString()
  weight?: string;

  @ApiPropertyOptional({ description: 'Height (cm)' })
  @IsOptional()
  @IsString()
  height?: string;

  @ApiPropertyOptional({ description: 'BMI' })
  @IsOptional()
  @IsString()
  bmi?: string;

  @ApiPropertyOptional({ description: 'Head circumference (cm) - pediatric' })
  @IsOptional()
  @IsString()
  headCircumference?: string;

  @ApiPropertyOptional({ description: 'Pain scale (0-10)' })
  @IsOptional()
  @IsString()
  painScale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}
