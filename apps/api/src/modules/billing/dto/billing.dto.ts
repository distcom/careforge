import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChargeStatus {
  PENDING = 'PENDING',
  BILLED = 'BILLED',
  PAID = 'PAID',
  ADJUSTED = 'ADJUSTED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  DENIED = 'DENIED',
  APPEALED = 'APPEALED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  EFT = 'EFT',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export class CreateChargeDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'CPT/HCPCS procedure code' })
  @IsString()
  cptCode: string;

  @ApiPropertyOptional({ description: 'ICD-10 diagnosis codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiProperty({ description: 'Fee amount' })
  @IsNumber()
  @Min(0)
  fee: number;

  @ApiPropertyOptional({ description: 'Service date' })
  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  @ApiPropertyOptional({ description: 'Provider ID' })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiPropertyOptional({ description: 'Modifiers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];

  @ApiPropertyOptional({ description: 'Units' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  units?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateClaimDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Insurance ID' })
  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @ApiProperty({ description: 'Charge IDs to include' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  chargeIds: string[];

  @ApiPropertyOptional({ description: 'Claim type' })
  @IsOptional()
  @IsEnum(['PROFESSIONAL', 'INSTITUTIONAL'])
  claimType?: string;

  @ApiPropertyOptional({ description: 'Provider NPI' })
  @IsOptional()
  @IsString()
  providerNpi?: string;

  @ApiPropertyOptional({ description: 'Facility NPI' })
  @IsOptional()
  @IsString()
  facilityNpi?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Charge IDs to apply payment to' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  chargeIds?: string[];

  @ApiPropertyOptional({ description: 'Claim ID (for insurance payments)' })
  @IsOptional()
  @IsUUID()
  claimId?: string;

  @ApiPropertyOptional({ description: 'Reference number (check #, transaction ID)' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateStatementDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Include only charges from date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Include only charges until date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Statement message' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class BillingFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
