import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService, CreateChargeDto, CreatePaymentDto } from './billing.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('charges')
  @ApiOperation({ summary: 'List charges' })
  @RequirePermissions('billing:read')
  findCharges(@Query() query: PaginationQuery & { patientId?: string; status?: string }) {
    return this.billingService.findCharges(query);
  }

  @Post('charges')
  @ApiOperation({ summary: 'Create charge' })
  @RequirePermissions('billing:write')
  createCharge(@Body() dto: CreateChargeDto) {
    return this.billingService.createCharge(dto);
  }

  @Get('claims')
  @ApiOperation({ summary: 'List claims' })
  @RequirePermissions('billing:read')
  findClaims(@Query() query: PaginationQuery & { status?: string }) {
    return this.billingService.findClaims(query);
  }

  @Post('claims')
  @ApiOperation({ summary: 'Create claim from charges' })
  @RequirePermissions('billing:write')
  createClaim(@Body() dto: { chargeIds: string[]; payerName: string; payerId?: string }) {
    return this.billingService.createClaim(dto.chargeIds, dto.payerName, dto.payerId);
  }

  @Post('claims/:id/submit')
  @ApiOperation({ summary: 'Submit claim' })
  @RequirePermissions('billing:write')
  submitClaim(@Param('id') id: string) {
    return this.billingService.submitClaim(id);
  }

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
