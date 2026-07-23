import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEventHandler } from './audit.event-handler';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditEventHandler],
  exports: [AuditService],
})
export class AuditModule {}
