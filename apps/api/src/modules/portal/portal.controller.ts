import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('portal')
export class PortalController {
  constructor(private portalService: PortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient portal dashboard' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getPatientDashboard(user.id);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get patient appointments' })
  getAppointments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.portalService.getAppointments(user.id, query);
  }

  @Post('appointments/request')
  @ApiOperation({ summary: 'Request appointment' })
  requestAppointment(@CurrentUser() user: AuthenticatedUser, @Body() dto: { providerId: string; preferredDate: string; reason: string }) {
    return this.portalService.requestAppointment(user.id, dto);
  }

  @Get('lab-results')
  @ApiOperation({ summary: 'Get patient lab results' })
  getLabResults(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.portalService.getLabResults(user.id, query);
  }

  @Get('medications')
  @ApiOperation({ summary: 'Get patient medications' })
  getMedications(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getMedications(user.id);
  }

  @Get('allergies')
  @ApiOperation({ summary: 'Get patient allergies' })
  getAllergies(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getAllergies(user.id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get patient documents' })
  getDocuments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.portalService.getDocuments(user.id, query);
  }

  @Get('bills')
  @ApiOperation({ summary: 'Get patient bills' })
  getBills(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQuery) {
    return this.portalService.getBills(user.id, query);
  }
}
