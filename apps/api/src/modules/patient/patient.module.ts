import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientMergeService } from './patient-merge.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PatientController],
  providers: [PatientService, PatientMergeService],
  exports: [PatientService, PatientMergeService],
})
export class PatientModule {}
