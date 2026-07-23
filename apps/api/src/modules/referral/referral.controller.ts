import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/referrals')
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Get()
  @ApiOperation({ summary: 'List patient referrals' })
  @RequirePermissions('clinical:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery & { status?: string }) {
    return this.referralService.findAll(patientId, query);
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
  create(@Param('patientId') patientId: string, @Body() dto: any) {
    return this.referralService.create({ ...dto, patientId });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update referral status' })
  @RequirePermissions('clinical:write')
  updateStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.referralService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete referral' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string) {
    return this.referralService.remove(id);
  }
}
