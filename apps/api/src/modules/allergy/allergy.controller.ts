import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AllergyService, CreateAllergyDto } from './allergy.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/allergies')
export class AllergyController {
  constructor(private allergyService: AllergyService) {}

  @Get()
  @ApiOperation({ summary: 'List patient allergies' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.allergyService.findAll(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Record new allergy' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: CreateAllergyDto) {
    return this.allergyService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update allergy' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.allergyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove allergy' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.allergyService.remove(id);
  }
}
