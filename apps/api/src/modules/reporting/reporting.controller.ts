import { Controller, Get, Post, Query, Body, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { ReportExportService, ReportExportOptions } from './report-export.service';
import { Roles } from '../../common/decorators/auth.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportingController {
  constructor(
    private reportingService: ReportingService,
    private reportExportService: ReportExportService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats() {
    return this.reportingService.getDashboardStats();
  }

  @Get('patient-census')
  @ApiOperation({ summary: 'Get patient census report' })
  getPatientCensus(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reportingService.getPatientCensus(dateFrom, dateTo);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @Roles('admin', 'billing')
  getRevenueReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reportingService.getRevenueReport(dateFrom, dateTo);
  }

  @Get('encounters')
  @ApiOperation({ summary: 'Get encounter report' })
  getEncounterReport(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.reportingService.getEncounterReport(dateFrom, dateTo);
  }

  @Get('accounts-receivable')
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @Roles('admin', 'billing')
  getAccountsReceivable() {
    return this.reportingService.getAccountsReceivable();
  }

  @Post('export/patient-roster')
  @ApiOperation({ summary: 'Export patient roster as CSV/PDF' })
  @Roles('admin', 'provider')
  async exportPatientRoster(@Body() options: ReportExportOptions, @Res() res: Response) {
    const result = await this.reportExportService.exportPatientRoster(options);
    res.set({ 'Content-Type': result.mimeType, 'Content-Disposition': `attachment; filename="${result.filename}"` });
    res.send(result.content);
  }

  @Post('export/financial')
  @ApiOperation({ summary: 'Export financial summary report' })
  @Roles('admin', 'billing')
  async exportFinancial(@Body() options: ReportExportOptions, @Res() res: Response) {
    const result = await this.reportExportService.exportFinancialSummary(options);
    res.set({ 'Content-Type': result.mimeType, 'Content-Disposition': `attachment; filename="${result.filename}"` });
    res.send(result.content);
  }

  @Post('export/encounters')
  @ApiOperation({ summary: 'Export encounter report' })
  @Roles('admin', 'provider')
  async exportEncounters(@Body() options: ReportExportOptions, @Res() res: Response) {
    const result = await this.reportExportService.exportEncounterReport(options);
    res.set({ 'Content-Type': result.mimeType, 'Content-Disposition': `attachment; filename="${result.filename}"` });
    res.send(result.content);
  }

  @Post('export/immunizations')
  @ApiOperation({ summary: 'Export immunization registry report' })
  @Roles('admin', 'provider')
  async exportImmunizations(@Body() options: ReportExportOptions, @Res() res: Response) {
    const result = await this.reportExportService.exportImmunizationReport(options);
    res.set({ 'Content-Type': result.mimeType, 'Content-Disposition': `attachment; filename="${result.filename}"` });
    res.send(result.content);
  }
}
