import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('admin')
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  findAll(@Query() query: PaginationQuery & { userId?: string; entityType?: string; action?: string; dateFrom?: string; dateTo?: string }) {
    return this.auditService.findAll(query);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get entity modification history' })
  getEntityHistory(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }
}
