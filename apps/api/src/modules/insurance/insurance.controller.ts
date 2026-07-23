import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

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
  createCompany(@Body() dto: any) {
    return this.insuranceService.createCompany(dto);
  }

  @Get('patients/:patientId')
  @ApiOperation({ summary: 'Get patient insurance coverage' })
  @RequirePermissions('insurance:read')
  getPatientInsurance(@Param('patientId') patientId: string) {
    return this.insuranceService.getPatientInsurance(patientId);
  }

  @Post('patients/:patientId')
  @ApiOperation({ summary: 'Add insurance to patient' })
  @RequirePermissions('insurance:write')
  addPatientInsurance(@Param('patientId') patientId: string, @Body() dto: any) {
    return this.insuranceService.addPatientInsurance(patientId, dto);
  }

  @Delete('patients/:patientId/:id')
  @ApiOperation({ summary: 'Remove patient insurance' })
  @RequirePermissions('insurance:write')
  removePatientInsurance(@Param('id') id: string) {
    return this.insuranceService.removePatientInsurance(id);
  }
}
