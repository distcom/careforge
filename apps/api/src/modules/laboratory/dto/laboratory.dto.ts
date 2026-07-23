import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LabOrderStatus {
  ORDERED = 'ORDERED',
  COLLECTED = 'COLLECTED',
  PROCESSING = 'PROCESSING',
  RESULTED = 'RESULTED',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
}

export enum LabPriority {
  ROUTINE = 'ROUTINE',
  ASAP = 'ASAP',
  STAT = 'STAT',
}

export class CreateLabOrderDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Test code (LOINC)' })
  @IsString()
  testCode: string;

  @ApiProperty({ description: 'Test name' })
  @IsString()
  testName: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsEnum(LabPriority)
  priority?: LabPriority;

  @ApiPropertyOptional({ description: 'Ordering provider ID' })
  @IsOptional()
  @IsUUID()
  orderedBy?: string;

  @ApiPropertyOptional({ description: 'Diagnosis codes for medical necessity' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: 'Fasting required' })
  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'External lab order ID' })
  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLabOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;

  @ApiPropertyOptional({ description: 'Lab results data' })
  @IsOptional()
  @IsArray()
  results?: Array<{
    identifier: string;
    value: string;
    units: string;
    referenceRange: string;
    abnormalFlag: string;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resultedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProcessHL7MessageDto {
  @ApiProperty({ description: 'Raw HL7 v2.x message' })
  @IsString()
  message: string;
}

export class LabFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;

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
  @IsBoolean()
  abnormalOnly?: boolean;
}
