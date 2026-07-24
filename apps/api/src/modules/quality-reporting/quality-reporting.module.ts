import { Module } from '@nestjs/common';
import { QualityReportingController } from './quality-reporting.controller';
import { QualityReportingService } from './quality-reporting.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [QualityReportingController],
  providers: [QualityReportingService],
  exports: [QualityReportingService],
})
export class QualityReportingModule {}
