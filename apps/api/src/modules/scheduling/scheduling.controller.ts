import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { RequirePermissions, CurrentUser, AuthenticatedUser } from '../../common/decorators/auth.decorator';
import { AppointmentQueryDto, CreateAppointmentDto, UpdateAppointmentDto, UpdateStatusDto } from './dto/scheduling.dto';

@ApiTags('scheduling')
@ApiBearerAuth()
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
    @Query('facilityId') facilityId?: string,
  ) {
    return this.schedulingService.getAvailableSlots(providerId, date, duration || 30, facilityId);
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

  @Get('flow/:facilityId')
  @ApiOperation({ summary: 'Get patient flow status for a facility' })
  @RequirePermissions('scheduling:read')
  getPatientFlow(
    @Param('facilityId') facilityId: string,
    @Query('date') date?: string,
  ) {
    return this.schedulingService.getPatientFlowStatus(facilityId, date || new Date().toISOString());
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'Get waitlist entries' })
  @RequirePermissions('scheduling:read')
  getWaitlist(
    @Query('facilityId') facilityId?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.schedulingService.getWaitlist(facilityId, providerId);
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
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.create(dto, user.id);
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
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: AuthenticatedUser) {
    // Route to specific flow methods based on status
    switch (dto.status) {
      case 'ARRIVED':
        return this.schedulingService.checkIn(id, user.id);
      case 'ROOMED':
        return this.schedulingService.roomPatient(id, dto.roomId, user.id);
      case 'IN_PROGRESS':
        return this.schedulingService.providerSeen(id, user.id);
      case 'COMPLETED':
        return this.schedulingService.checkOut(id, user.id);
      case 'NO_SHOW':
        return this.schedulingService.recordNoShow(id, user.id);
      case 'CANCELLED':
        return this.schedulingService.cancel(id, dto.reason || 'Cancelled', user.id);
      default:
        return this.schedulingService.update(id, { status: dto.status } as any);
    }
  }

  // Patient Flow Endpoints
  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check in patient' })
  @RequirePermissions('scheduling:write')
  checkIn(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.checkIn(id, user.id);
  }

  @Post(':id/room')
  @ApiOperation({ summary: 'Room patient' })
  @RequirePermissions('scheduling:write')
  roomPatient(@Param('id') id: string, @Body('roomId') roomId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.roomPatient(id, roomId, user.id);
  }

  @Post(':id/provider-seen')
  @ApiOperation({ summary: 'Mark provider has seen patient' })
  @RequirePermissions('scheduling:write')
  providerSeen(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.providerSeen(id, user.id);
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check out patient' })
  @RequirePermissions('scheduling:write')
  checkOut(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.checkOut(id, user.id);
  }

  @Post(':id/no-show')
  @ApiOperation({ summary: 'Record no-show' })
  @RequirePermissions('scheduling:write')
  recordNoShow(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.recordNoShow(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @RequirePermissions('scheduling:write')
  cancel(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.cancel(id, reason, user.id);
  }

  // Waitlist Endpoints
  @Post('waitlist')
  @ApiOperation({ summary: 'Add patient to waitlist' })
  @RequirePermissions('scheduling:write')
  addToWaitlist(
    @Body() dto: {
      patientId: string;
      providerId?: string;
      facilityId?: string;
      appointmentTypeId?: string;
      reason?: string;
      priority?: number;
      preferredDays?: number[];
      preferredTimeOfDay?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.schedulingService.addToWaitlist(dto, user.id);
  }

  @Delete('waitlist/:id')
  @ApiOperation({ summary: 'Remove from waitlist' })
  @RequirePermissions('scheduling:write')
  removeFromWaitlist(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthenticatedUser) {
    return this.schedulingService.removeFromWaitlist(id, reason, user.id);
  }
}
