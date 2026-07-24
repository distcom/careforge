import { Module } from '@nestjs/common';
import { AllergyController } from './allergy.controller';
import { AllergyService } from './allergy.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AllergyController],
  providers: [AllergyService],
  exports: [AllergyService],
})
export class AllergyModule {}
