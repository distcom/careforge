import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Messaging DTOs ---
export class CreateMessageDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsUUID()
  recipientId: string;

  @ApiProperty({ description: 'Subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Related patient ID' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Parent message ID (for replies)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class ReplyMessageDto {
  @ApiProperty({ description: 'Reply body' })
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

// --- Care Plan DTOs ---
export class CreateCarePlanDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Care plan title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Care plan type' })
  @IsEnum(['CHRONIC_DISEASE', 'PREVENTIVE', 'POST_ACUTE', 'PALLIATIVE', 'WELLNESS', 'OTHER'])
  type: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Goals' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Interventions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interventions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @ApiPropertyOptional({ description: 'Team member IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  teamMembers?: string[];
}

export class UpdateCarePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interventions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  reviewDate?: string;
}

// --- Referral DTOs ---
export class CreateReferralDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Referring provider ID' })
  @IsUUID()
  referringProviderId: string;

  @ApiPropertyOptional({ description: 'Referred-to provider name' })
  @IsOptional()
  @IsString()
  referredToName?: string;

  @ApiPropertyOptional({ description: 'Referred-to provider NPI' })
  @IsOptional()
  @IsString()
  referredToNpi?: string;

  @ApiProperty({ description: 'Specialty' })
  @IsString()
  specialty: string;

  @ApiProperty({ description: 'Reason for referral' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Diagnosis codes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnosisCodes?: string[];

  @ApiPropertyOptional({ description: 'Urgency' })
  @IsOptional()
  @IsEnum(['ROUTINE', 'URGENT', 'EMERGENT'])
  urgency?: string;

  @ApiPropertyOptional({ description: 'Notes to specialist' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedDate?: string;
}

export class UpdateReferralDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'DECLINED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedDate?: string;
}

// --- Document DTOs ---
export class UploadDocumentDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Document type' })
  @IsEnum(['LAB_REPORT', 'IMAGING', 'CLINICAL_NOTE', 'CONSENT', 'CORRESPONDENCE', 'INSURANCE', 'LEGAL', 'OTHER'])
  type: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Encounter ID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;
}

// --- Telehealth DTOs ---
export class CreateTelehealthSessionDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  providerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Max duration in minutes' })
  @IsOptional()
  @IsNumber()
  maxDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRecording?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;
}

export class JoinSessionDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsEnum(['provider', 'patient', 'interpreter', 'observer'])
  role: string;
}
