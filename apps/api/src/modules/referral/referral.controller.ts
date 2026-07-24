import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralService, AuthRequestDto, AuthDecisionDto } from './referral.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/referrals')
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Get()
  @ApiOperation({ summary: 'List patient referrals' })
  @RequirePermissions('clinical:read')
  findAll(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { status?: string; authStatus?: string },
  ) {
    return this.referralService.findAll(patientId, query);
  }

  @Get('authorizations/pending')
  @ApiOperation({ summary: 'List pending authorization requests' })
  @RequirePermissions('clinical:read')
  getPendingAuthorizations(@Query() query: PaginationQuery) {
    return this.referralService.getPendingAuthorizations(query);
  }

  @Get('authorizations/expiring')
  @ApiOperation({ summary: 'List expiring authorizations' })
  @RequirePermissions('clinical:read')
  getExpiringAuthorizations(@Query('days') days?: string) {
    return this.referralService.getExpiringAuthorizations(days ? parseInt(days, 10) : 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get referral by ID' })
  @RequirePermissions('clinical:read')
  findOne(@Param('id') id: string) {
    return this.referralService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create referral' })
  @RequirePermissions('clinical:write')
  create(
    @Param('patientId') patientId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.referralService.create({ ...dto, patientId }, user?.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update referral status' })
  @RequirePermissions('clinical:write')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.referralService.updateStatus(id, dto.status, user?.id, dto.reason);
  }

  @Post(':id/authorization')
  @ApiOperation({ summary: 'Request authorization for referral' })
  @RequirePermissions('clinical:write')
  requestAuthorization(
    @Param('id') id: string,
    @Body() dto: AuthRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.referralService.requestAuthorization(id, dto, user?.id);
  }

  @Put(':id/authorization/decision')
  @ApiOperation({ summary: 'Record authorization decision' })
  @RequirePermissions('clinical:write')
  recordAuthDecision(
    @Param('id') id: string,
    @Body() dto: AuthDecisionDto,
    @CurrentUser() user: any,
  ) {
    return this.referralService.recordAuthDecision(id, dto, user?.id);
  }

  @Post(':id/visit')
  @ApiOperation({ summary: 'Record authorized visit usage' })
  @RequirePermissions('clinical:write')
  recordVisit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referralService.recordVisit(id, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete referral' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.referralService.remove(id, user?.id);
  }
}
