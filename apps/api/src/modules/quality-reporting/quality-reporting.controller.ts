import {
  Controller, Get, Post, Query, Body, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QualityReportingService } from './quality-reporting.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quality-reporting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('quality')
export class QualityReportingController {
  constructor(private qualityReportingService: QualityReportingService) {}

  @Get('measures')
  @ApiOperation({ summary: 'Get quality measures for a period' })
  @RequirePermissions('quality:read')
  getQualityMeasures(
    @Query('period') period: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qualityReportingService.getQualityMeasures(period || new Date().getFullYear().toString(), user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get quality dashboard' })
  @RequirePermissions('quality:read')
  getQualityDashboard(
    @Query('period') period: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qualityReportingService.getQualityDashboard(period || new Date().getFullYear().toString(), user.id);
  }

  @Post('public-health-report')
  @ApiOperation({ summary: 'Generate public health report' })
  @RequirePermissions('quality:write')
  generatePublicHealthReport(
    @Body() dto: { reportType: string; period: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qualityReportingService.generatePublicHealthReport(dto.reportType, dto.period, user.id);
  }

  @Post('ecqm-export')
  @ApiOperation({ summary: 'Export eCQM measure' })
  @RequirePermissions('quality:write')
  exportEcqm(
    @Body() dto: { measureId: string; period: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qualityReportingService.exportEcqm(dto.measureId, dto.period, user.id);
  }
}
