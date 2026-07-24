import { Module } from '@nestjs/common';
import { TelehealthController } from './telehealth.controller';
import { TelehealthService } from './telehealth.service';
import { TelehealthSessionService } from './telehealth-session.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TelehealthController],
  providers: [TelehealthService, TelehealthSessionService],
  exports: [TelehealthService, TelehealthSessionService],
})
export class TelehealthModule {}
