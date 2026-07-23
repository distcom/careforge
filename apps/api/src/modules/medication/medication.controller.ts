import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicationService, CreateMedicationDto, CreatePrescriptionDto } from './medication.service';
import { DrugInteractionService } from './drug-interaction.service';
import { EprescribingService } from './eprescribing.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/medications')
export class MedicationController {
  constructor(
    private medicationService: MedicationService,
    private drugInteractionService: DrugInteractionService,
    private eprescribingService: EprescribingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient medications' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery & { status?: string }) {
    return this.medicationService.findAll(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Add medication' })
  @RequirePermissions('clinical:write')
  create(@Param('patientId') patientId: string, @Body() dto: CreateMedicationDto) {
    return this.medicationService.create({ ...dto, patientId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update medication' })
  @RequirePermissions('clinical:write')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.medicationService.update(id, dto);
  }

  @Post(':id/discontinue')
  @ApiOperation({ summary: 'Discontinue medication' })
  @RequirePermissions('clinical:write')
  discontinue(@Param('id') id: string) {
    return this.medicationService.discontinue(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove medication' })
  @RequirePermissions('clinical:delete')
  remove(@Param('id') id: string) {
    return this.medicationService.remove(id);
  }

  @Get('prescriptions')
  @ApiOperation({ summary: 'List patient prescriptions' })
  @RequirePermissions('clinical:read')
  findPrescriptions(@Param('patientId') patientId: string, @Query() query: PaginationQuery) {
    return this.medicationService.findPrescriptions(patientId, query);
  }

  @Post('prescriptions')
  @ApiOperation({ summary: 'Create prescription' })
  @RequirePermissions('clinical:write')
  createPrescription(
    @Param('patientId') patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.medicationService.createPrescription({ ...dto, patientId, providerId: user.id });
  }

  @Post('prescriptions/:id/transmit')
  @ApiOperation({ summary: 'Transmit prescription to pharmacy' })
  @RequirePermissions('clinical:write')
  transmitPrescription(@Param('id') id: string) {
    return this.medicationService.transmitPrescription(id);
  }

  @Post('drug-interaction-check')
  @ApiOperation({ summary: 'Check drug interactions for a patient' })
  @RequirePermissions('clinical:read')
  checkInteractions(@Param('patientId') patientId: string, @Body() dto: { drugName: string; rxnormCode?: string }) {
    return this.drugInteractionService.checkInteractions(patientId, dto.drugName, dto.rxnormCode);
  }

  @Post('eprescribe')
  @ApiOperation({ summary: 'Create and transmit electronic prescription' })
  @RequirePermissions('clinical:write')
  eprescribe(
    @Param('patientId') patientId: string,
    @Body() dto: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eprescribingService.createPrescription({ ...dto, patientId, prescriberId: user.id });
  }

  @Post('eprescribe/:id/refill')
  @ApiOperation({ summary: 'Request refill for electronic prescription' })
  @RequirePermissions('clinical:write')
  refill(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eprescribingService.requestRefill(id, user.id);
  }

  @Post('eprescribe/:id/cancel')
  @ApiOperation({ summary: 'Cancel electronic prescription' })
  @RequirePermissions('clinical:write')
  cancelRx(@Param('id') id: string, @Body() dto: { reason: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.eprescribingService.cancelPrescription(id, user.id, dto.reason);
  }

  @Post('reconciliation')
  @ApiOperation({ summary: 'Perform medication reconciliation' })
  @RequirePermissions('clinical:write')
  reconciliation(@Param('patientId') patientId: string, @Body() dto: { medications: any[]; encounterId?: string }) {
    return this.eprescribingService.reconcileMedications(patientId, dto.medications, dto.encounterId);
  }
}
