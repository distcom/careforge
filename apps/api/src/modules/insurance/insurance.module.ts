import { Module } from '@nestjs/common';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
