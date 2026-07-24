import { Module } from '@nestjs/common';
import { CCdaController } from './c-cda.controller';
import { CCdaService } from './c-cda.service';
import { CCdaGenerator } from './c-cda.generator';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CCdaController],
  providers: [CCdaService, CCdaGenerator],
  exports: [CCdaService, CCdaGenerator],
})
export class CCdaModule {}
