import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ConsentService,
  CreateConsentDto,
  SignConsentDto,
  RevokeConsentDto,
  CreateRestrictionDto,
  AccessOverrideDto,
} from './consent.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('consent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/consent')
export class ConsentController {
  constructor(private consentService: ConsentService) {}

  // Consent endpoints
  @Get()
  @ApiOperation({ summary: 'List patient consents' })
  @RequirePermissions('consent:read')
  findAllConsents(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { consentType?: string; status?: string },
  ) {
    return this.consentService.findAllConsents(patientId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create consent record' })
  @RequirePermissions('consent:write')
  createConsent(
    @Param('patientId') patientId: string,
    @Body() dto: Omit<CreateConsentDto, 'patientId'>,
    @CurrentUser() user: any,
  ) {
    return this.consentService.createConsent({ ...dto, patientId }, user?.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign/grant consent' })
  @RequirePermissions('consent:write')
  signConsent(
    @Param('id') id: string,
    @Body() dto: SignConsentDto,
    @CurrentUser() user: any,
  ) {
    return this.consentService.signConsent(id, dto, user?.id);
  }

  @Post(':id/deny')
  @ApiOperation({ summary: 'Deny consent' })
  @RequirePermissions('consent:write')
  denyConsent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consentService.denyConsent(id, user?.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke consent' })
  @RequirePermissions('consent:write')
  revokeConsent(
    @Param('id') id: string,
    @Body() dto: RevokeConsentDto,
    @CurrentUser() user: any,
  ) {
    return this.consentService.revokeConsent(id, dto, user?.id);
  }

  // Privacy restriction endpoints
  @Get('restrictions')
  @ApiOperation({ summary: 'List patient privacy restrictions' })
  @RequirePermissions('privacy:read')
  findAllRestrictions(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.consentService.findAllRestrictions(patientId, query);
  }

  @Post('restrictions')
  @ApiOperation({ summary: 'Create privacy restriction' })
  @RequirePermissions('privacy:write')
  createRestriction(
    @Param('patientId') patientId: string,
    @Body() dto: Omit<CreateRestrictionDto, 'patientId'>,
    @CurrentUser() user: any,
  ) {
    return this.consentService.createRestriction({ ...dto, patientId }, user?.id);
  }

  @Delete('restrictions/:id')
  @ApiOperation({ summary: 'Remove privacy restriction' })
  @RequirePermissions('privacy:write')
  removeRestriction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.consentService.removeRestriction(id, user?.id);
  }

  // Access override endpoints
  @Post('access-override')
  @ApiOperation({ summary: 'Record access override (break glass)' })
  @RequirePermissions('privacy:override')
  recordAccessOverride(
    @Param('patientId') patientId: string,
    @Body() dto: Omit<AccessOverrideDto, 'patientId'>,
    @CurrentUser() user: any,
  ) {
    return this.consentService.recordAccessOverride({ ...dto, patientId }, user?.id);
  }

  @Get('access-overrides')
  @ApiOperation({ summary: 'List access override history' })
  @RequirePermissions('privacy:read')
  getAccessOverrides(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery,
  ) {
    return this.consentService.getAccessOverrides(patientId, query);
  }
}
