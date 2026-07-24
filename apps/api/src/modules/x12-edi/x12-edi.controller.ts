import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { X12EdiService } from './x12-edi.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('x12-edi')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('x12-edi')
export class X12EdiController {
  constructor(private x12EdiService: X12EdiService) {}

  @Post('claims/837/:chargeId')
  @ApiOperation({ summary: 'Generate 837 claim for a charge' })
  @RequirePermissions('billing:write')
  generateClaim(@Param('chargeId') chargeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.generateClaim837(chargeId, user.id);
  }

  @Post('claims/837/batch')
  @ApiOperation({ summary: 'Submit batch claims (837)' })
  @RequirePermissions('billing:write')
  submitBatch(@Body() dto: { chargeIds: string[] }, @CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.submitBatchClaims(dto.chargeIds, user.id);
  }

  @Post('remittance/835')
  @ApiOperation({ summary: 'Process inbound 835 remittance advice' })
  @RequirePermissions('billing:write')
  processRemittance(@Body() dto: { transaction: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.processRemittance835(dto.transaction, user.id);
  }

  @Post('eligibility/270')
  @ApiOperation({ summary: 'Generate 270 eligibility inquiry' })
  @RequirePermissions('insurance:read')
  checkEligibility(
    @Body() dto: { patientId: string; payerId: string; serviceType: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.x12EdiService.checkEligibility270(dto.patientId, dto.payerId, dto.serviceType, user.id);
  }

  @Post('eligibility/271')
  @ApiOperation({ summary: 'Process inbound 271 eligibility response' })
  @RequirePermissions('insurance:read')
  processEligibilityResponse(@Body() dto: { transaction: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.processEligibilityResponse271(dto.transaction, user.id);
  }

  @Post('inbound')
  @ApiOperation({ summary: 'Process any inbound X12 transaction' })
  @RequirePermissions('billing:write')
  processInbound(@Body() dto: { transaction: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.processInboundTransaction(dto.transaction, user.id);
  }

  @Get('claims/summary')
  @ApiOperation({ summary: 'Get claims processing summary' })
  @RequirePermissions('billing:read')
  getClaimsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.x12EdiService.getClaimsSummary(user.id);
  }
}
