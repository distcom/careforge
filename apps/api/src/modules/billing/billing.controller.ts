import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService, CreateChargeDto, CreatePaymentDto, CodeChargeDto, ReviewChargeDto } from './billing.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  // Charges
  @Get('charges')
  @ApiOperation({ summary: 'List charges' })
  @RequirePermissions('billing:read')
  findCharges(@Query() query: PaginationQuery & { patientId?: string; status?: string; codingStatus?: string }) {
    return this.billingService.findCharges(query);
  }

  @Post('charges')
  @ApiOperation({ summary: 'Create charge' })
  @RequirePermissions('billing:write')
  createCharge(@Body() dto: CreateChargeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createCharge(dto, user.id);
  }

  // Coding Workflow
  @Post('charges/:id/code')
  @ApiOperation({ summary: 'Code a charge with ICD-10 codes' })
  @RequirePermissions('billing:write')
  codeCharge(@Param('id') id: string, @Body() dto: CodeChargeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.codeCharge(id, dto, user.id);
  }

  @Post('charges/:id/review')
  @ApiOperation({ summary: 'Review a coded charge' })
  @RequirePermissions('billing:write')
  reviewCharge(@Param('id') id: string, @Body() dto: ReviewChargeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.reviewCharge(id, dto, user.id);
  }

  @Post('charges/:id/approve')
  @ApiOperation({ summary: 'Approve a reviewed charge' })
  @RequirePermissions('billing:write')
  approveCharge(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.approveCharge(id, user.id);
  }

  @Post('charges/:id/bill')
  @ApiOperation({ summary: 'Mark charge as billed' })
  @RequirePermissions('billing:write')
  markChargeBilled(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.markChargeBilled(id, user.id);
  }

  @Get('charges/pending-coding')
  @ApiOperation({ summary: 'Get charges pending coding' })
  @RequirePermissions('billing:read')
  getPendingCoding(@Query() query: PaginationQuery) {
    return this.billingService.getPendingCoding(query);
  }

  @Get('charges/for-review')
  @ApiOperation({ summary: 'Get charges for review' })
  @RequirePermissions('billing:read')
  getChargesForReview(@Query() query: PaginationQuery) {
    return this.billingService.getChargesForReview(query);
  }

  @Get('coding-summary')
  @ApiOperation({ summary: 'Get coding workflow summary' })
  @RequirePermissions('billing:read')
  getCodingSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getCodingSummary(user.id);
  }

  // Claims
  @Get('claims')
  @ApiOperation({ summary: 'List claims' })
  @RequirePermissions('billing:read')
  findClaims(@Query() query: PaginationQuery & { status?: string }) {
    return this.billingService.findClaims(query);
  }

  @Post('claims')
  @ApiOperation({ summary: 'Create claim from charges' })
  @RequirePermissions('billing:write')
  createClaim(@Body() dto: { chargeIds: string[]; payerName: string; payerId?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createClaim(dto.chargeIds, dto.payerName, dto.payerId, user.id);
  }

  @Post('claims/:id/submit')
  @ApiOperation({ summary: 'Submit claim' })
  @RequirePermissions('billing:write')
  submitClaim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.submitClaim(id, user.id);
  }

  // Payments
  @Post('payments')
  @ApiOperation({ summary: 'Post payment' })
  @RequirePermissions('billing:write')
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.createPayment(dto, user.id);
  }

  @Get('patients/:patientId/balance')
  @ApiOperation({ summary: 'Get patient account balance' })
  @RequirePermissions('billing:read')
  getPatientBalance(@Param('patientId') patientId: string) {
    return this.billingService.getPatientBalance(patientId);
  }

  @Get('fee-schedules')
  @ApiOperation({ summary: 'Get fee schedules' })
  @RequirePermissions('billing:read')
  getFeeSchedules() {
    return this.billingService.getFeeSchedules();
  }
}
