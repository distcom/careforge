import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ClinicalDecisionSupportService,
  CreateAlertDto,
  CreateCareGapDto,
} from './clinical-decision-support.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clinical-decision-support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/cds')
export class ClinicalDecisionSupportController {
  constructor(private cdsService: ClinicalDecisionSupportService) {}

  // Alert endpoints
  @Get('alerts')
  @ApiOperation({ summary: 'Get patient clinical alerts' })
  @RequirePermissions('clinical:read')
  getPatientAlerts(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { status?: string; alertType?: string },
  ) {
    return this.cdsService.getPatientAlerts(patientId, query);
  }

  @Get('alerts/active')
  @ApiOperation({ summary: 'Get active alerts for patient' })
  @RequirePermissions('clinical:read')
  getActiveAlerts(@Param('patientId') patientId: string) {
    return this.cdsService.getActiveAlerts(patientId);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create clinical alert' })
  @RequirePermissions('clinical:write')
  createAlert(
    @Param('patientId') patientId: string,
    @Body() dto: Omit<CreateAlertDto, 'patientId'>,
    @CurrentUser() user: any,
  ) {
    return this.cdsService.createAlert({ ...dto, patientId }, user?.id);
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @RequirePermissions('clinical:write')
  acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cdsService.acknowledgeAlert(id, user?.id);
  }

  @Post('alerts/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss alert' })
  @RequirePermissions('clinical:write')
  dismissAlert(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.cdsService.dismissAlert(id, dto.reason, user?.id);
  }

  // Care gap endpoints
  @Get('care-gaps')
  @ApiOperation({ summary: 'Get patient care gaps' })
  @RequirePermissions('clinical:read')
  getPatientCareGaps(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { status?: string },
  ) {
    return this.cdsService.getPatientCareGaps(patientId, query);
  }

  @Get('care-gaps/open')
  @ApiOperation({ summary: 'Get open care gaps for patient' })
  @RequirePermissions('clinical:read')
  getOpenCareGaps(@Param('patientId') patientId: string) {
    return this.cdsService.getOpenCareGaps(patientId);
  }

  @Post('care-gaps')
  @ApiOperation({ summary: 'Create care gap' })
  @RequirePermissions('clinical:write')
  createCareGap(
    @Param('patientId') patientId: string,
    @Body() dto: Omit<CreateCareGapDto, 'patientId'>,
    @CurrentUser() user: any,
  ) {
    return this.cdsService.createCareGap({ ...dto, patientId }, user?.id);
  }

  @Post('care-gaps/:id/close')
  @ApiOperation({ summary: 'Close care gap' })
  @RequirePermissions('clinical:write')
  closeCareGap(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.cdsService.closeCareGap(id, dto.reason, user?.id);
  }

  // Preventive care check
  @Get('preventive-check')
  @ApiOperation({ summary: 'Check preventive care gaps' })
  @RequirePermissions('clinical:read')
  checkPreventiveCare(@Param('patientId') patientId: string) {
    return this.cdsService.checkPreventiveCare(patientId);
  }

  // Drug interaction check
  @Post('drug-interaction-check')
  @ApiOperation({ summary: 'Check drug interactions' })
  @RequirePermissions('clinical:read')
  checkDrugInteractions(
    @Param('patientId') patientId: string,
    @Body() dto: { medicationName: string },
  ) {
    return this.cdsService.checkDrugInteractions(patientId, dto.medicationName);
  }
}
