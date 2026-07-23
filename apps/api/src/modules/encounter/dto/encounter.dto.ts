import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class DiagnosisDto {
  @ApiProperty({ example: 'J06.9' })
  @IsString()
  icd10Code: string;

  @ApiProperty({ example: 'Acute upper respiratory infection' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProcedureDto {
  @ApiProperty({ example: '99213' })
  @IsString()
  cptCode: string;

  @ApiProperty({ example: 'Office visit, established patient' })
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modifiers?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  units?: number;
}

export class CreateEncounterDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ default: 'OFFICE_VISIT' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Cough and fever for 3 days' })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hpi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ros?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalExam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ type: [DiagnosisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisDto)
  diagnoses?: DiagnosisDto[];

  @ApiPropertyOptional({ type: [ProcedureDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcedureDto)
  procedures?: ProcedureDto[];
}

export class UpdateEncounterDto extends PartialType(CreateEncounterDto) {}

export class SignEncounterDto {
  @ApiPropertyOptional({ description: 'Co-signing provider ID' })
  @IsOptional()
  @IsString()
  cosignedById?: string;
}
