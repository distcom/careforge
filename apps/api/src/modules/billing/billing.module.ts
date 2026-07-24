import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingEventHandler } from './billing.event-handler';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BillingController],
  providers: [BillingService, BillingEventHandler],
  exports: [BillingService],
})
export class BillingModule {}
