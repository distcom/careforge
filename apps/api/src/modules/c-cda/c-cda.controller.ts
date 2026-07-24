import {
  Controller, Get, Post, Body, Param, Query, UseGuards, Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CCdaService } from './c-cda.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('c-cda')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('c-cda')
export class CCdaController {
  constructor(private cCdaService: CCdaService) {}

  @Post('ccd/:patientId')
  @ApiOperation({ summary: 'Generate Continuity of Care Document (CCD)' })
  @RequirePermissions('clinical:read')
  async generateCCD(
    @Param('patientId') patientId: string,
    @Query('download') download: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.cCdaService.generateCCD(patientId, user.id);

    if (download === 'true') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="CCD_${patientId}_${result.documentId}.xml"`);
      return res.send(result.xml);
    }

    return res.json(result);
  }

  @Post('discharge-summary/:patientId/:encounterId')
  @ApiOperation({ summary: 'Generate Discharge Summary' })
  @RequirePermissions('clinical:write')
  async generateDischargeSummary(
    @Param('patientId') patientId: string,
    @Param('encounterId') encounterId: string,
    @Body() dto: { dischargeInstructions: string },
    @Query('download') download: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.cCdaService.generateDischargeSummary(
      patientId,
      encounterId,
      dto.dischargeInstructions,
      user.id,
    );

    if (download === 'true') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="DischargeSummary_${encounterId}_${result.documentId}.xml"`);
      return res.send(result.xml);
    }

    return res.json(result);
  }

  @Post('referral-summary/:patientId/:referralId')
  @ApiOperation({ summary: 'Generate Referral Summary' })
  @RequirePermissions('clinical:read')
  async generateReferralSummary(
    @Param('patientId') patientId: string,
    @Param('referralId') referralId: string,
    @Query('download') download: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const result = await this.cCdaService.generateReferralSummary(patientId, referralId, user.id);

    if (download === 'true') {
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="ReferralSummary_${referralId}_${result.documentId}.xml"`);
      return res.send(result.xml);
    }

    return res.json(result);
  }

  @Get('documents/:patientId')
  @ApiOperation({ summary: 'List generated C-CDA documents for a patient' })
  @RequirePermissions('clinical:read')
  listDocuments(@Param('patientId') patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cCdaService.listGeneratedDocuments(patientId, user.id);
  }
}
