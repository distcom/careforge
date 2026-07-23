import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcedureService, CreateProcedureDto } from './procedure.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/procedures')
export class ProcedureController {
  constructor(private procedureService: ProcedureService) {}

  @Get()
  @ApiOperation({ summary: 'List patient procedures' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.procedureService.findAll(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Record procedure' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: CreateProcedureDto) {
    return this.procedureService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update procedure' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.procedureService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove procedure' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.procedureService.remove(id);
  }
}
