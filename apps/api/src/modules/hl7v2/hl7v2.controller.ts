import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Hl7v2Service } from './hl7v2.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('hl7v2')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('hl7v2')
export class Hl7v2Controller {
  constructor(private hl7v2Service: Hl7v2Service) {}

  @Post('inbound')
  @ApiOperation({ summary: 'Process inbound HL7 v2 message' })
  @RequirePermissions('interoperability:write')
  processInbound(@Body() dto: { message: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.hl7v2Service.processInboundMessage(dto.message, user.id);
  }

  @Post('outbound/adt/admit/:patientId')
  @ApiOperation({ summary: 'Generate ADT A01 (Admit) message' })
  @RequirePermissions('interoperability:write')
  generateAdmit(@Param('patientId') patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hl7v2Service.generatePatientAdmit(patientId, user.id);
  }

  @Post('outbound/adt/update/:patientId')
  @ApiOperation({ summary: 'Generate ADT A08 (Update) message' })
  @RequirePermissions('interoperability:write')
  generateUpdate(@Param('patientId') patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.hl7v2Service.generatePatientUpdate(patientId, user.id);
  }

  @Post('outbound/orm')
  @ApiOperation({ summary: 'Generate ORM O01 (Order) message' })
  @RequirePermissions('interoperability:write')
  generateOrder(
    @Body() dto: { patientId: string; orderCode: string; orderDescription: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hl7v2Service.generateOrderMessage(dto.patientId, dto.orderCode, dto.orderDescription, user.id);
  }

  @Post('outbound/oru')
  @ApiOperation({ summary: 'Generate ORU R01 (Result) message' })
  @RequirePermissions('interoperability:write')
  generateResult(
    @Body() dto: {
      patientId: string;
      orderId: string;
      observations: { code: string; name: string; value: string; unit: string; range?: string; flag?: string }[];
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hl7v2Service.generateResultMessage(dto.patientId, dto.orderId, dto.observations, user.id);
  }
}
