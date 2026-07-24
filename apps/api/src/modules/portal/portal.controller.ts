import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService, UpdateProfileDto, RequestAppointmentDto } from './portal.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('patient-portal')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('portal')
export class PortalController {
  constructor(private portalService: PortalService) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient portal dashboard' })
  @RequirePermissions('portal:read')
  getDashboard(@CurrentUser() user: any) {
    return this.portalService.getPatientDashboard(user?.patientId, user?.id);
  }

  // Profile
  @Get('profile')
  @ApiOperation({ summary: 'Get patient profile' })
  @RequirePermissions('portal:read')
  getProfile(@CurrentUser() user: any) {
    return this.portalService.getProfile(user?.patientId, user?.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update patient profile' })
  @RequirePermissions('portal:write')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: any) {
    return this.portalService.updateProfile(user?.patientId, dto, user?.id);
  }

  // Appointments
  @Get('appointments')
  @ApiOperation({ summary: 'Get patient appointments' })
  @RequirePermissions('portal:read')
  getAppointments(@Query() query: PaginationQuery & { status?: string }, @CurrentUser() user: any) {
    return this.portalService.getAppointments(user?.patientId, query);
  }

  @Post('appointments/request')
  @ApiOperation({ summary: 'Request appointment' })
  @RequirePermissions('portal:write')
  requestAppointment(@Body() dto: RequestAppointmentDto, @CurrentUser() user: any) {
    return this.portalService.requestAppointment(user?.patientId, dto, user?.id);
  }

  @Post('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  @RequirePermissions('portal:write')
  cancelAppointment(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.portalService.cancelAppointment(user?.patientId, id, dto.reason, user?.id);
  }

  // Health Records
  @Get('conditions')
  @ApiOperation({ summary: 'Get patient conditions' })
  @RequirePermissions('portal:read')
  getConditions(@CurrentUser() user: any) {
    return this.portalService.getConditions(user?.patientId, user?.id);
  }

  @Get('medications')
  @ApiOperation({ summary: 'Get patient medications' })
  @RequirePermissions('portal:read')
  getMedications(@CurrentUser() user: any) {
    return this.portalService.getMedications(user?.patientId, user?.id);
  }

  @Get('allergies')
  @ApiOperation({ summary: 'Get patient allergies' })
  @RequirePermissions('portal:read')
  getAllergies(@CurrentUser() user: any) {
    return this.portalService.getAllergies(user?.patientId, user?.id);
  }

  @Get('immunizations')
  @ApiOperation({ summary: 'Get patient immunizations' })
  @RequirePermissions('portal:read')
  getImmunizations(@CurrentUser() user: any) {
    return this.portalService.getImmunizations(user?.patientId, user?.id);
  }

  @Get('vitals')
  @ApiOperation({ summary: 'Get patient vitals history' })
  @RequirePermissions('portal:read')
  getVitals(@Query() query: PaginationQuery, @CurrentUser() user: any) {
    return this.portalService.getVitals(user?.patientId, query);
  }

  // Lab Results
  @Get('lab-results')
  @ApiOperation({ summary: 'Get patient lab results' })
  @RequirePermissions('portal:read')
  getLabResults(@Query() query: PaginationQuery, @CurrentUser() user: any) {
    return this.portalService.getLabResults(user?.patientId, query);
  }

  // Documents
  @Get('documents')
  @ApiOperation({ summary: 'Get shared documents' })
  @RequirePermissions('portal:read')
  getDocuments(@Query() query: PaginationQuery, @CurrentUser() user: any) {
    return this.portalService.getDocuments(user?.patientId, query);
  }

  // Billing
  @Get('bills')
  @ApiOperation({ summary: 'Get patient bills' })
  @RequirePermissions('portal:read')
  getBills(@Query() query: PaginationQuery, @CurrentUser() user: any) {
    return this.portalService.getBills(user?.patientId, query);
  }

  // Consents
  @Get('consents')
  @ApiOperation({ summary: 'Get patient consents' })
  @RequirePermissions('portal:read')
  getConsents(@CurrentUser() user: any) {
    return this.portalService.getConsents(user?.patientId, user?.id);
  }

  @Post('consents/:id/sign')
  @ApiOperation({ summary: 'Sign consent' })
  @RequirePermissions('portal:write')
  signConsent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.portalService.signConsent(user?.patientId, id, user?.id);
  }
}
