import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CarePlanService, CreateInterventionDto, CreateTeamMemberDto } from './care-plan.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('care-plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/care-plans')
export class CarePlanController {
  constructor(private carePlanService: CarePlanService) {}

  @Get()
  @ApiOperation({ summary: 'List patient care plans' })
  @RequirePermissions('clinical:read')
  findAll(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { status?: string },
  ) {
    return this.carePlanService.findAll(patientId, query);
  }

  @Get('due-for-review')
  @ApiOperation({ summary: 'Get care plans due for review' })
  @RequirePermissions('clinical:read')
  getDueForReview(@Query('days') days?: string) {
    return this.carePlanService.getDueForReview(days ? parseInt(days, 10) : 7);
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
  create(
    @Param('patientId') patientId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.create({ ...dto, patientId }, user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update care plan' })
  @RequirePermissions('clinical:write')
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.update(id, dto, user?.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update care plan status' })
  @RequirePermissions('clinical:write')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.updateStatus(id, dto.status, user?.id);
  }

  @Post(':id/goals')
  @ApiOperation({ summary: 'Add goal to care plan' })
  @RequirePermissions('clinical:write')
  addGoal(
    @Param('id') id: string,
    @Body() dto: { title: string; description?: string; targetDate?: string; priority?: string },
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.addGoal(id, dto, user?.id);
  }

  @Put('goals/:goalId')
  @ApiOperation({ summary: 'Update care plan goal' })
  @RequirePermissions('clinical:write')
  updateGoal(
    @Param('goalId') goalId: string,
    @Body() dto: { status?: string; achievedAt?: string; progressNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.updateGoal(goalId, dto, user?.id);
  }

  @Post(':id/interventions')
  @ApiOperation({ summary: 'Add intervention to care plan' })
  @RequirePermissions('clinical:write')
  addIntervention(
    @Param('id') id: string,
    @Body() dto: CreateInterventionDto,
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.addIntervention(id, dto, user?.id);
  }

  @Put('interventions/:interventionId')
  @ApiOperation({ summary: 'Update care plan intervention' })
  @RequirePermissions('clinical:write')
  updateIntervention(
    @Param('interventionId') interventionId: string,
    @Body() dto: Partial<CreateInterventionDto> & { status?: string },
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.updateIntervention(interventionId, dto, user?.id);
  }

  @Post(':id/team-members')
  @ApiOperation({ summary: 'Add team member to care plan' })
  @RequirePermissions('clinical:write')
  addTeamMember(
    @Param('id') id: string,
    @Body() dto: CreateTeamMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.carePlanService.addTeamMember(id, dto, user?.id);
  }

  @Delete('team-members/:memberId')
  @ApiOperation({ summary: 'Remove team member from care plan' })
  @RequirePermissions('clinical:write')
  removeTeamMember(@Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.carePlanService.removeTeamMember(memberId, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete care plan' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.carePlanService.remove(id, user?.id);
  }
}
