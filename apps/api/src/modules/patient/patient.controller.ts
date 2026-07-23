import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PatientQueryDto, CreatePatientDto, UpdatePatientDto, MergePatientDto } from './dto/patient.dto';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients')
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Get()
  @ApiOperation({ summary: 'List patients with search and filters' })
  @RequirePermissions('patient:read')
  findAll(@Query() query: PatientQueryDto) {
    return this.patientService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  @RequirePermissions('patient:read')
  findOne(@Param('id') id: string) {
    return this.patientService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new patient' })
  @RequirePermissions('patient:write')
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient' })
  @RequirePermissions('patient:write')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate patient (soft delete)' })
  @RequirePermissions('patient:delete')
  remove(@Param('id') id: string) {
    return this.patientService.remove(id);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge duplicate patients' })
  @RequirePermissions('patient:write')
  merge(@Body() dto: MergePatientDto) {
    return this.patientService.merge(dto.sourceId, dto.targetId);
  }
}
