import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CarePlanService } from './care-plan.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('care-plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/care-plans')
export class CarePlanController {
  constructor(private carePlanService: CarePlanService) {}

  @Get()
  @ApiOperation({ summary: 'List patient care plans' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.carePlanService.findAll(patientId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get care plan by ID' })
  @RequirePermissions('clinical:read')
  findOne(@Param('id') id: string) {
    return this.carePlanService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create care plan' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: any) {
    return this.carePlanService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update care plan' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.carePlanService.update(id, dto);
  }

  @Post(':id/goals')
  @ApiOperation({ summary: 'Add goal to care plan' })
  @RequirePermissions('clinical:write')
  addGoal(@Param('id') id: string, @Body() dto: { title: string; description?: string; targetDate?: string }) {
    return this.carePlanService.addGoal(id, dto);
  }

  @Put('goals/:goalId')
  @ApiOperation({ summary: 'Update care plan goal' })
  @RequirePermissions('clinical:write')
  updateGoal(@Param('goalId') goalId: string, @Body() dto: { status?: string; achievedAt?: string }) {
    return this.carePlanService.updateGoal(goalId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete care plan (soft)' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string) {
    return this.carePlanService.remove(id);
  }
}
