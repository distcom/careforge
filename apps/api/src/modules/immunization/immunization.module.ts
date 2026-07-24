import { Module } from '@nestjs/common';
import { ImmunizationController } from './immunization.controller';
import { ImmunizationService } from './immunization.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ImmunizationController],
  providers: [ImmunizationService],
  exports: [ImmunizationService],
})
export class ImmunizationModule {}
