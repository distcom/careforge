import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ImmunizationService, CreateImmunizationDto } from './immunization.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/immunizations')
export class ImmunizationController {
  constructor(private immunizationService: ImmunizationService) {}

  @Get()
  @ApiOperation({ summary: 'List patient immunizations' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.immunizationService.findAll(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Record immunization' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: CreateImmunizationDto) {
    return this.immunizationService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update immunization record' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.immunizationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete immunization record' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.immunizationService.remove(id);
  }
}
