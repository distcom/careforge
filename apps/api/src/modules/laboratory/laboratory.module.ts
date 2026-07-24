import { Module } from '@nestjs/common';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { Hl7Service } from './hl7.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LaboratoryController],
  providers: [LaboratoryService, Hl7Service],
  exports: [LaboratoryService, Hl7Service],
})
export class LaboratoryModule {}
