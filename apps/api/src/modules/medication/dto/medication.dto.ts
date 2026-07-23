import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID, IsBoolean, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MedicationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISCONTINUED = 'DISCONTINUED',
  ON_HOLD = 'ON_HOLD',
  DRAFT = 'DRAFT',
  TRANSMITTED = 'TRANSMITTED',
  FILLED = 'FILLED',
}

export class CreateMedicationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'RxNorm code' })
  @IsOptional()
  @IsString()
  rxnormCode?: string;

  @ApiPropertyOptional({ description: 'NDC code' })
  @IsOptional()
  @IsString()
  ndcCode?: string;

  @ApiProperty({ description: 'Dosage (e.g., 500mg)' })
  @IsString()
  dosage: string;

  @ApiProperty({ description: 'Frequency (e.g., twice daily)' })
  @IsString()
  frequency: string;

  @ApiPropertyOptional({ description: 'Route of administration' })
  @IsOptional()
  @IsEnum(['ORAL', 'IV', 'IM', 'SUBQ', 'TOPICAL', 'INHALED', 'RECTAL', 'OPHTHALMIC', 'OTIC', 'NASAL', 'TRANSDERMAL'])
  route?: string;

  @ApiPropertyOptional({ description: 'Duration' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ description: 'Quantity to dispense' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Number of refills' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refills?: number;

  @ApiPropertyOptional({ description: 'Prescriber ID' })
  @IsOptional()
  @IsUUID()
  prescriberId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'PRN (as needed)' })
  @IsOptional()
  @IsBoolean()
  asNeeded?: boolean;

  @ApiPropertyOptional({ description: 'Instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Pharmacy NCPDP ID' })
  @IsOptional()
  @IsString()
  pharmacyNcpdpId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMedicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refills?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(MedicationStatus)
  status?: MedicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckInteractionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Drug name to check' })
  @IsString()
  drugName: string;

  @ApiPropertyOptional({ description: 'RxNorm code' })
  @IsOptional()
  @IsString()
  rxnormCode?: string;
}

export class PrescriptionDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Medication name' })
  @IsString()
  medicationName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rxnormCode?: string;

  @ApiProperty()
  @IsString()
  dosage: string;

  @ApiProperty()
  @IsString()
  frequency: string;

  @ApiProperty()
  @IsString()
  route: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  refills: number;

  @ApiProperty()
  @IsUUID()
  prescriberId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pharmacyNcpdpId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReconcileMedicationsDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Medication reconciliation list', type: 'array' })
  @IsArray()
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    action: 'CONTINUE' | 'DISCONTINUE' | 'MODIFY' | 'ADD';
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}
