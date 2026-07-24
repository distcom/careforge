import { Module } from '@nestjs/common';
import { MedicationController } from './medication.controller';
import { MedicationService } from './medication.service';
import { DrugInteractionService } from './drug-interaction.service';
import { EprescribingService } from './eprescribing.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [MedicationController],
  providers: [MedicationService, DrugInteractionService, EprescribingService],
  exports: [MedicationService, DrugInteractionService, EprescribingService],
})
export class MedicationModule {}
