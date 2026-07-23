import { Controller, Post, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('full')
  async createFullBackup(@Query('compress') compress: string = 'true') {
    return this.backupService.createFullBackup(compress !== 'false');
  }

  @Post('schema')
  async createSchemaBackup() {
    return this.backupService.createSchemaBackup();
  }

  @Post('data')
  async createDataBackup(@Query('tables') tables?: string) {
    return this.backupService.createDataBackup(tables?.split(',').filter(Boolean));
  }

  @Post('restore/:filename')
  async restoreBackup(
    @Param('filename') filename: string,
    @Query('dropFirst') dropFirst: string = 'false',
  ) {
    return this.backupService.restoreBackup(filename, { dropFirst: dropFirst === 'true' });
  }

  @Get()
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Get('verify/:filename')
  async verifyBackup(@Param('filename') filename: string) {
    return this.backupService.verifyBackup(filename);
  }

  @Get('stats')
  async getDatabaseStats() {
    return this.backupService.getDatabaseStats();
  }

  @Delete(':filename')
  async deleteBackup(@Param('filename') filename: string) {
    return this.backupService.deleteBackup(filename);
  }
}
