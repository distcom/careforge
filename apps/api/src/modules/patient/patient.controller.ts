import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { RequirePermissions, CurrentUser } from '../../common/decorators/auth.decorator';
import { PatientQueryDto, CreatePatientDto, UpdatePatientDto, MergePatientDto, DuplicateCheckDto } from './dto/patient.dto';
import { AuthenticatedUser } from '../identity/interfaces/authenticated-user.interface';
import { PatientAccessGuard } from '../../common/guards/patient-access.guard';

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

  @Post('check-duplicates')
  @ApiOperation({ summary: 'Check for potential duplicate patients before registration' })
  @RequirePermissions('patient:write')
  checkDuplicates(@Body() dto: DuplicateCheckDto) {
    return this.patientService.checkDuplicates(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID (patient-scoped access control)' })
  @UseGuards(PatientAccessGuard)
  @RequirePermissions('patient:read')
  findOne(@Param('id') id: string) {
    return this.patientService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register new patient with duplicate detection' })
  @RequirePermissions('patient:write')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update patient (patient-scoped access control)' })
  @UseGuards(PatientAccessGuard)
  @RequirePermissions('patient:write')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate patient (soft delete)' })
  @UseGuards(PatientAccessGuard)
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
