import {
  Controller, Get, Post, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataMigrationService, MigrationConfig } from './data-migration.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('data-migration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('migration')
export class DataMigrationController {
  constructor(private dataMigrationService: DataMigrationService) {}

  // Jobs
  @Post('jobs')
  @ApiOperation({ summary: 'Create migration job' })
  @RequirePermissions('migration:write')
  createJob(@Body() config: MigrationConfig, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.createMigrationJob(config, user.id);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List migration jobs' })
  @RequirePermissions('migration:read')
  listJobs() {
    return this.dataMigrationService.listMigrationJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get migration job' })
  @RequirePermissions('migration:read')
  getJob(@Param('id') id: string) {
    return this.dataMigrationService.getMigrationJob(id);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Cancel migration job' })
  @RequirePermissions('migration:write')
  cancelJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.cancelMigrationJob(id, user.id);
  }

  // Preflight
  @Get('preflight')
  @ApiOperation({ summary: 'Run preflight analysis' })
  @RequirePermissions('migration:read')
  preflight(@Query('sourceType') sourceType: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.runPreflightAnalysis(sourceType || 'OPENEMR', user.id);
  }

  // Dry Run
  @Post('dry-run')
  @ApiOperation({ summary: 'Run dry run validation' })
  @RequirePermissions('migration:write')
  dryRun(
    @Body() dto: { sourceType: string; sampleData: any[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataMigrationService.runDryRun(dto.sourceType, dto.sampleData, user.id);
  }

  // Mapping
  @Get('mapping-template')
  @ApiOperation({ summary: 'Get mapping template' })
  @RequirePermissions('migration:read')
  getMappingTemplate(
    @Query('sourceType') sourceType: string,
    @Query('entityType') entityType: string,
  ) {
    return this.dataMigrationService.getMappingTemplate(sourceType || 'OPENEMR', entityType || 'Patient');
  }

  // Reconciliation
  @Post('reconcile')
  @ApiOperation({ summary: 'Reconcile migrated data' })
  @RequirePermissions('migration:read')
  reconcile(
    @Body() dto: { entityType: string; sourceIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataMigrationService.reconcileData(dto.entityType, dto.sourceIds, user.id);
  }

  // Exception Queue
  @Get('jobs/:id/exceptions')
  @ApiOperation({ summary: 'Get exception queue for job' })
  @RequirePermissions('migration:read')
  getExceptions(@Param('id') id: string) {
    return this.dataMigrationService.getExceptionQueue(id);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry failed records' })
  @RequirePermissions('migration:write')
  retryFailed(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.retryFailedRecords(id, user.id);
  }

  // Reports
  @Get('jobs/:id/report')
  @ApiOperation({ summary: 'Generate migration report' })
  @RequirePermissions('migration:read')
  getReport(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.generateMigrationReport(id, user.id);
  }

  // Rollback
  @Post('jobs/:id/rollback-point')
  @ApiOperation({ summary: 'Create rollback point' })
  @RequirePermissions('migration:write')
  createRollbackPoint(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.createRollbackPoint(id, user.id);
  }

  @Post('rollback/:rollbackId')
  @ApiOperation({ summary: 'Execute rollback' })
  @RequirePermissions('migration:write')
  executeRollback(@Param('rollbackId') rollbackId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dataMigrationService.executeRollback(rollbackId, user.id);
  }
}
