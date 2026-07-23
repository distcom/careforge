import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ReportExportService } from './report-export.service';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ReportExportService],
  exports: [ReportingService, ReportExportService],
})
export class ReportingModule {}
