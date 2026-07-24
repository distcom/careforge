import { Module } from '@nestjs/common';
import { CarePlanController } from './care-plan.controller';
import { CarePlanService } from './care-plan.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CarePlanController],
  providers: [CarePlanService],
  exports: [CarePlanService],
})
export class CarePlanModule {}
