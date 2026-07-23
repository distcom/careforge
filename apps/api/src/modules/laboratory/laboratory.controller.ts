import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LaboratoryService, CreateLabOrderDto, ResultEntryDto } from './laboratory.service';
import { Hl7Service } from './hl7.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('laboratory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('lab-orders')
export class LaboratoryController {
  constructor(
    private labService: LaboratoryService,
    private hl7Service: Hl7Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List lab orders' })
  @RequirePermissions('lab:read')
  findAll(@Query() query: PaginationQuery & { patientId?: string; status?: string }) {
    return this.labService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lab order by ID' })
  @RequirePermissions('lab:read')
  findOne(@Param('id') id: string) {
    return this.labService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create lab order' })
  @RequirePermissions('lab:write')
  create(@Body() dto: CreateLabOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.labService.create({ ...dto, providerId: dto.providerId || user.id });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update lab order status' })
  @RequirePermissions('lab:write')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.labService.updateStatus(id, status);
  }

  @Put(':id/items/:itemId/result')
  @ApiOperation({ summary: 'Enter result for lab order item' })
  @RequirePermissions('lab:write')
  enterResult(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: ResultEntryDto) {
    return this.labService.enterResult(id, itemId, dto);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review and sign off lab order' })
  @RequirePermissions('lab:review')
  review(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.labService.reviewOrder(id, user.id);
  }

  @Post('hl7/ingest')
  @ApiOperation({ summary: 'Ingest incoming HL7 v2.x message (ORM/ORU/ADT)' })
  @RequirePermissions('lab:write')
  ingestHl7(@Body() body: { message: string }) {
    return this.hl7Service.processMessage(body.message);
  }

  @Post('hl7/parse')
  @ApiOperation({ summary: 'Parse HL7 message without processing' })
  @RequirePermissions('lab:read')
  parseHl7(@Body() body: { message: string }) {
    return this.hl7Service.parseMessage(body.message);
  }

  @Post(':id/hl7-order')
  @ApiOperation({ summary: 'Generate outgoing HL7 ORM message for lab order' })
  @RequirePermissions('lab:write')
  generateHl7Order(@Param('id') id: string) {
    return this.labService.generateHl7Order(id);
  }
}
