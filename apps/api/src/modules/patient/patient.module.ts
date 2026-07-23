import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientMergeService } from './patient-merge.service';

@Module({
  controllers: [PatientController],
  providers: [PatientService, PatientMergeService],
  exports: [PatientService, PatientMergeService],
})
export class PatientModule {}
