import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService, AddPatientInsuranceDto, VerifyEligibilityDto } from './insurance.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('insurance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('insurance')
export class InsuranceController {
  constructor(private insuranceService: InsuranceService) {}

  @Get('companies')
  @ApiOperation({ summary: 'List insurance companies' })
  @RequirePermissions('insurance:read')
  findCompanies(@Query() query: PaginationQuery) {
    return this.insuranceService.findCompanies(query);
  }

  @Post('companies')
  @ApiOperation({ summary: 'Create insurance company' })
  @RequirePermissions('insurance:write')
  createCompany(@Body() dto: any, @CurrentUser() user: any) {
    return this.insuranceService.createCompany(dto, user?.id);
  }

  @Get('patients/:patientId')
  @ApiOperation({ summary: 'Get patient insurance coverage' })
  @RequirePermissions('insurance:read')
  getPatientInsurance(@Param('patientId') patientId: string) {
    return this.insuranceService.getPatientInsurance(patientId);
  }

  @Get('patients/:patientId/summary')
  @ApiOperation({ summary: 'Get patient insurance eligibility summary' })
  @RequirePermissions('insurance:read')
  getEligibilitySummary(@Param('patientId') patientId: string) {
    return this.insuranceService.getEligibilitySummary(patientId);
  }

  @Post('patients/:patientId')
  @ApiOperation({ summary: 'Add insurance to patient' })
  @RequirePermissions('insurance:write')
  addPatientInsurance(
    @Param('patientId') patientId: string,
    @Body() dto: AddPatientInsuranceDto,
    @CurrentUser() user: any,
  ) {
    return this.insuranceService.addPatientInsurance(patientId, dto, user?.id);
  }

  @Put('coverage/:id')
  @ApiOperation({ summary: 'Update patient insurance' })
  @RequirePermissions('insurance:write')
  updatePatientInsurance(
    @Param('id') id: string,
    @Body() dto: Partial<AddPatientInsuranceDto>,
    @CurrentUser() user: any,
  ) {
    return this.insuranceService.updatePatientInsurance(id, dto, user?.id);
  }

  @Post('coverage/:id/verify')
  @ApiOperation({ summary: 'Verify insurance eligibility' })
  @RequirePermissions('insurance:write')
  verifyEligibility(
    @Param('id') id: string,
    @Body() dto: VerifyEligibilityDto,
    @CurrentUser() user: any,
  ) {
    return this.insuranceService.verifyEligibility(id, dto, user?.id);
  }

  @Post('patients/:patientId/primary/:insuranceId')
  @ApiOperation({ summary: 'Set primary insurance' })
  @RequirePermissions('insurance:write')
  setPrimary(
    @Param('patientId') patientId: string,
    @Param('insuranceId') insuranceId: string,
    @CurrentUser() user: any,
  ) {
    return this.insuranceService.setPrimary(patientId, insuranceId, user?.id);
  }

  @Delete('coverage/:id')
  @ApiOperation({ summary: 'Remove patient insurance' })
  @RequirePermissions('insurance:write')
  removePatientInsurance(@Param('id') id: string, @CurrentUser() user: any) {
    return this.insuranceService.removePatientInsurance(id, user?.id);
  }
}
