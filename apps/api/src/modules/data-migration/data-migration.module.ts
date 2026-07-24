import { Module } from '@nestjs/common';
import { DataMigrationController } from './data-migration.controller';
import { DataMigrationService } from './data-migration.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DataMigrationController],
  providers: [DataMigrationService],
  exports: [DataMigrationService],
})
export class DataMigrationModule {}
