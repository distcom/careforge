import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConditionService, CreateConditionDto, UpdateConditionDto } from './condition.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/conditions')
export class ConditionController {
  constructor(private conditionService: ConditionService) {}

  @Get()
  @ApiOperation({ summary: 'List patient conditions/problem list' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery & { status?: string }) {
    return this.conditionService.findAll(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Add condition to problem list' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: CreateConditionDto) {
    return this.conditionService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update condition' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: UpdateConditionDto) {
    return this.conditionService.update(id, dto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Mark condition as resolved' })
  @RequirePermissions('clinical:write')
  resolve(@Param('id') id: string) {
    return this.conditionService.resolve(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove condition' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.conditionService.remove(id);
  }
}
