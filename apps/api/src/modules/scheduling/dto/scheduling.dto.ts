import { IsString, IsOptional, IsInt, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

export class AppointmentQueryDto extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  patientId: string;

  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiProperty()
  @IsString()
  facilityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentTypeId?: string;

  @ApiProperty({ enum: ['new_patient', 'follow_up', 'procedure', 'telehealth', 'urgent', 'OFFICE_VISIT'] })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: '2024-06-15T09:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2024-06-15T09:30:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(5)
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recurrenceId?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'ROOMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;
}
