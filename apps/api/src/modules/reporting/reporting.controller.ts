import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService, DateRange } from './reporting.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reporting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportingController {
  constructor(private reportingService: ReportingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @RequirePermissions('reporting:read')
  getDashboardStats(@CurrentUser() user: any) {
    return this.reportingService.getDashboardStats(user?.id);
  }

  @Get('patient-census')
  @ApiOperation({ summary: 'Get patient census report' })
  @RequirePermissions('reporting:read')
  getPatientCensus(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getPatientCensus(query, user?.id);
  }

  @Get('clinical-summary')
  @ApiOperation({ summary: 'Get clinical summary report' })
  @RequirePermissions('reporting:read')
  getClinicalSummary(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getClinicalSummary(query, user?.id);
  }

  @Get('provider-productivity')
  @ApiOperation({ summary: 'Get provider productivity report' })
  @RequirePermissions('reporting:read')
  getProviderProductivity(
    @Query() query: DateRange & { providerId?: string },
    @CurrentUser() user: any,
  ) {
    return this.reportingService.getProviderProductivity(query.providerId, query, user?.id);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @RequirePermissions('financial:read')
  getRevenueReport(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getRevenueReport(query, user?.id);
  }

  @Get('accounts-receivable')
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @RequirePermissions('financial:read')
  getAccountsReceivable(@CurrentUser() user: any) {
    return this.reportingService.getAccountsReceivable(user?.id);
  }

  @Get('claims')
  @ApiOperation({ summary: 'Get claims report' })
  @RequirePermissions('financial:read')
  getClaimsReport(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getClaimsReport(query, user?.id);
  }

  @Get('appointment-utilization')
  @ApiOperation({ summary: 'Get appointment utilization report' })
  @RequirePermissions('reporting:read')
  getAppointmentUtilization(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getAppointmentUtilization(query, user?.id);
  }

  @Get('lab-turnaround')
  @ApiOperation({ summary: 'Get lab turnaround report' })
  @RequirePermissions('reporting:read')
  getLabTurnaround(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getLabTurnaround(query, user?.id);
  }

  @Get('encounters')
  @ApiOperation({ summary: 'Get encounter report' })
  @RequirePermissions('reporting:read')
  getEncounterReport(@Query() query: DateRange, @CurrentUser() user: any) {
    return this.reportingService.getEncounterReport(query, user?.id);
  }
}
