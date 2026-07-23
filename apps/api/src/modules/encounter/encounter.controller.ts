import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EncounterService } from './encounter.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CreateEncounterDto, UpdateEncounterDto, SignEncounterDto, DiagnosisDto } from './dto/encounter.dto';

@ApiTags('encounters')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('encounters')
export class EncounterController {
  constructor(private encounterService: EncounterService) {}

  @Get()
  @ApiOperation({ summary: 'List encounters' })
  @RequirePermissions('encounter:read')
  findAll(@Query() query: PaginationQuery & { patientId?: string; providerId?: string; status?: string }) {
    return this.encounterService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get encounter by ID' })
  @RequirePermissions('encounter:read')
  findOne(@Param('id') id: string) {
    return this.encounterService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new encounter' })
  @RequirePermissions('encounter:write')
  create(@Body() dto: CreateEncounterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update encounter' })
  @RequirePermissions('encounter:write')
  update(@Param('id') id: string, @Body() dto: UpdateEncounterDto) {
    return this.encounterService.update(id, dto);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign encounter' })
  @RequirePermissions('encounter:sign')
  sign(@Param('id') id: string, @Body() dto: SignEncounterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.sign(id, dto, user.id);
  }

  @Post(':id/diagnoses')
  @ApiOperation({ summary: 'Add diagnosis to encounter' })
  @RequirePermissions('encounter:write')
  addDiagnosis(@Param('id') id: string, @Body() dto: DiagnosisDto) {
    return this.encounterService.addDiagnosis(id, dto);
  }

  @Post(':id/procedures')
  @ApiOperation({ summary: 'Add procedure to encounter' })
  @RequirePermissions('encounter:write')
  addProcedure(@Param('id') id: string, @Body() dto: { cptCode: string; description: string; modifiers?: string; units?: number; fee?: number }) {
    return this.encounterService.addProcedure(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete encounter (soft)' })
  @RequirePermissions('encounter:delete')
  remove(@Param('id') id: string) {
    return this.encounterService.remove(id);
  }
}
