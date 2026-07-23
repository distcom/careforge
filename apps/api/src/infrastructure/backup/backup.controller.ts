import { Controller, Post, Get, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { Roles } from '../../common/decorators/auth.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

/**
 * Backup operations are restricted to authenticated system administrators only.
 * All operations are audit-logged.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('full')
  @HttpCode(HttpStatus.ACCEPTED)
  async createFullBackup(@CurrentUser() user: AuthenticatedUser) {
    return this.backupService.createFullBackup(user.id);
  }

  @Post('schema')
  @HttpCode(HttpStatus.ACCEPTED)
  async createSchemaBackup(@CurrentUser() user: AuthenticatedUser) {
    return this.backupService.createSchemaBackup(user.id);
  }

  @Get()
  async listBackups(@CurrentUser() user: AuthenticatedUser) {
    return this.backupService.listBackups(user.id);
  }

  @Get('verify/:filename')
  async verifyBackup(
    @Param('filename') filename: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.backupService.verifyBackup(filename, user.id);
  }

  @Get('stats')
  async getDatabaseStats(@CurrentUser() user: AuthenticatedUser) {
    return this.backupService.getDatabaseStats(user.id);
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBackup(
    @Param('filename') filename: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.backupService.deleteBackup(filename, user.id);
  }
}
