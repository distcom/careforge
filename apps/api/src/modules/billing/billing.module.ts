import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingEventHandler } from './billing.event-handler';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingEventHandler],
  exports: [BillingService],
})
export class BillingModule {}
