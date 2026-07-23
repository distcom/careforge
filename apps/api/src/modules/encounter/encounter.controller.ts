import {
  Controller, Get, Post, Put, Body, Param, Query, Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EncounterService, CreateClinicalNoteDto, AmendNoteDto } from './encounter.service';
import { RequirePermissions, CurrentUser, AuthenticatedUser } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CreateEncounterDto, UpdateEncounterDto, SignEncounterDto, DiagnosisDto } from './dto/encounter.dto';

@ApiTags('encounters')
@ApiBearerAuth()
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
  update(@Param('id') id: string, @Body() dto: UpdateEncounterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.update(id, dto, user.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign encounter' })
  @RequirePermissions('encounter:sign')
  sign(@Param('id') id: string, @Body() dto: SignEncounterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.sign(id, dto, user.id);
  }

  @Post(':id/amend')
  @ApiOperation({ summary: 'Amend signed encounter' })
  @RequirePermissions('encounter:sign')
  amend(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.amend(id, reason, user.id);
  }

  @Post(':id/entered-in-error')
  @ApiOperation({ summary: 'Mark encounter as entered in error' })
  @RequirePermissions('encounter:sign')
  markEnteredInError(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.markEnteredInError(id, reason, user.id);
  }

  // Clinical Notes
  @Post(':id/notes')
  @ApiOperation({ summary: 'Create clinical note' })
  @RequirePermissions('encounter:write')
  createNote(
    @Param('id') encounterId: string,
    @Body() dto: Omit<CreateClinicalNoteDto, 'encounterId'>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encounterService.createNote({ ...dto, encounterId }, user.id);
  }

  @Post('notes/:noteId/finalize')
  @ApiOperation({ summary: 'Finalize clinical note' })
  @RequirePermissions('encounter:sign')
  finalizeNote(@Param('noteId') noteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.finalizeNote(noteId, user.id);
  }

  @Post('notes/:noteId/amend')
  @ApiOperation({ summary: 'Amend clinical note (non-destructive)' })
  @RequirePermissions('encounter:sign')
  amendNote(@Param('noteId') noteId: string, @Body() dto: AmendNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.amendNote(noteId, dto, user.id);
  }

  // Diagnoses and Procedures
  @Post(':id/diagnoses')
  @ApiOperation({ summary: 'Add diagnosis to encounter' })
  @RequirePermissions('encounter:write')
  addDiagnosis(@Param('id') id: string, @Body() dto: DiagnosisDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.addDiagnosis(id, dto, user.id);
  }

  @Post(':id/procedures')
  @ApiOperation({ summary: 'Add procedure to encounter' })
  @RequirePermissions('encounter:write')
  addProcedure(
    @Param('id') id: string,
    @Body() dto: { cptCode: string; description: string; modifiers?: string; units?: number; fee?: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encounterService.addProcedure(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete encounter (soft)' })
  @RequirePermissions('encounter:delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encounterService.remove(id, user.id);
  }
}
