import {
  IsString, IsOptional, IsEmail, IsDateString, IsEnum,
  IsArray, ValidateNested, IsBoolean, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

export class PatientQueryDto extends PaginationQuery {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'DECEASED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Date of birth from (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date of birth to (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class ContactDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class InsuranceDto {
  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiProperty()
  @IsString()
  policyNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriberName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  priority?: number;
}

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  suffix?: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'] })
  @IsString()
  gender: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ssn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  race?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalRecordNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [ContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  @ApiPropertyOptional({ type: [InsuranceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InsuranceDto)
  insurances?: InsuranceDto[];
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class MergePatientDto {
  @ApiProperty({ description: 'Source patient ID to merge from' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: 'Target patient ID to merge into' })
  @IsString()
  targetId: string;
}
