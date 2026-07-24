import { Module } from '@nestjs/common';
import { ConditionController } from './condition.controller';
import { ConditionService } from './condition.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ConditionController],
  providers: [ConditionService],
  exports: [ConditionService],
})
export class ConditionModule {}
