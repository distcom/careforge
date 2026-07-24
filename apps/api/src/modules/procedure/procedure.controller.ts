import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcedureService } from './procedure.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('procedures')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/procedures')
export class ProcedureController {
  constructor(private procedureService: ProcedureService) {}

  @Get()
  @ApiOperation({ summary: 'List patient procedures' })
  @RequirePermissions('clinical:read')
  findAll(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { status?: string },
  ) {
    return this.procedureService.findAll(patientId, query);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled procedures' })
  @RequirePermissions('clinical:read')
  getScheduled(@Query() query: PaginationQuery & { date?: string }) {
    return this.procedureService.getScheduledProcedures(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get procedure by ID' })
  @RequirePermissions('clinical:read')
  findOne(@Param('id') id: string) {
    return this.procedureService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create/schedule procedure' })
  @RequirePermissions('clinical:write')
  create(
    @Param('patientId') patientId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.procedureService.create({ ...dto, patientId }, user?.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update procedure' })
  @RequirePermissions('clinical:write')
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.procedureService.update(id, dto, user?.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update procedure status' })
  @RequirePermissions('clinical:write')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.procedureService.updateStatus(id, dto.status, user?.id, dto.reason);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Record procedure completion' })
  @RequirePermissions('clinical:write')
  recordCompletion(
    @Param('id') id: string,
    @Body() dto: {
      operativeNotes?: string;
      postOpNotes?: string;
      complications?: string;
      specimenCollected?: boolean;
      specimenNotes?: string;
      pathologyOrdered?: boolean;
      actualDuration?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.procedureService.recordCompletion(id, dto, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete procedure' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.procedureService.remove(id, user?.id);
  }
}
