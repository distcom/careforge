import { Module } from '@nestjs/common';
import { X12EdiController } from './x12-edi.controller';
import { X12EdiService } from './x12-edi.service';
import { X12Parser } from './x12.parser';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [X12EdiController],
  providers: [X12EdiService, X12Parser],
  exports: [X12EdiService, X12Parser],
})
export class X12EdiModule {}
