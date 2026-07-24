import { Module } from '@nestjs/common';
import { ClinicalDecisionSupportController } from './clinical-decision-support.controller';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ClinicalDecisionSupportController],
  providers: [ClinicalDecisionSupportService],
  exports: [ClinicalDecisionSupportService],
})
export class ClinicalDecisionSupportModule {}
