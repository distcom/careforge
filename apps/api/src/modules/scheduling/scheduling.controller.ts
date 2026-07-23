import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { AppointmentQueryDto, CreateAppointmentDto, UpdateAppointmentDto, UpdateStatusDto } from './dto/scheduling.dto';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('appointments')
export class SchedulingController {
  constructor(private schedulingService: SchedulingService) {}

  @Get()
  @ApiOperation({ summary: 'List appointments with filters' })
  @RequirePermissions('scheduling:read')
  findAll(@Query() query: AppointmentQueryDto) {
    return this.schedulingService.findAll(query);
  }

  @Get('slots')
  @ApiOperation({ summary: 'Get available time slots for a provider' })
  @RequirePermissions('scheduling:read')
  getAvailableSlots(
    @Query('providerId') providerId: string,
    @Query('date') date: string,
    @Query('duration') duration?: number,
  ) {
    return this.schedulingService.getAvailableSlots(providerId, date, duration || 30);
  }

  @Get('provider/:providerId/schedule')
  @ApiOperation({ summary: 'Get provider schedule for date range' })
  @RequirePermissions('scheduling:read')
  getProviderSchedule(
    @Param('providerId') providerId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.schedulingService.getProviderSchedule(providerId, dateFrom, dateTo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  @RequirePermissions('scheduling:read')
  findOne(@Param('id') id: string) {
    return this.schedulingService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new appointment' })
  @RequirePermissions('scheduling:write')
  create(@Body() dto: CreateAppointmentDto) {
    return this.schedulingService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update appointment' })
  @RequirePermissions('scheduling:write')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.schedulingService.update(id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update appointment status' })
  @RequirePermissions('scheduling:write')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.schedulingService.updateStatus(id, dto.status, dto.reason);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @RequirePermissions('scheduling:write')
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.schedulingService.cancel(id, reason);
  }
}
