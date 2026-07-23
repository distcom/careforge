import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VitalsService, CreateVitalsDto } from './vitals.service';
import { GrowthChartService } from './growth-chart.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/vitals')
export class VitalsController {
  constructor(
    private vitalsService: VitalsService,
    private growthChartService: GrowthChartService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient vitals history' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.vitalsService.findAll(patientId, query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest vitals for patient' })
  @RequirePermissions('clinical:read')
  getLatest(@Param('patientId') patientId: string) {
    return this.vitalsService.getLatest(patientId);
  }

  @Get('trends/:metric')
  @ApiOperation({ summary: 'Get vitals trend data for a metric' })
  @RequirePermissions('clinical:read')
  getTrends(
    @Param('patientId') patientId: string,
    @Param('metric') metric: string,
    @Query('limit') limit?: number,
  ) {
    return this.vitalsService.getTrends(patientId, metric, limit || 20);
  }

  @Post()
  @ApiOperation({ summary: 'Record new vitals' })
  @RequirePermissions('clinical:write')
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateVitalsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vitalsService.create({ ...dto, patientId, recordedById: user.id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vitals record' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.vitalsService.remove(id);
  }

  @Get('growth-chart')
  @ApiOperation({ summary: 'Get pediatric growth chart data (WHO/CDC percentiles)' })
  @RequirePermissions('clinical:read')
  getGrowthChart(
    @Param('patientId') patientId: string,
    @Query('metric') metric?: 'weight' | 'height' | 'bmi' | 'headCircumference',
  ) {
    return this.growthChartService.calculateGrowthChart(patientId, metric || 'weight');
  }
}
