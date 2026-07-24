import { Module } from '@nestjs/common';
import { Hl7v2Controller } from './hl7v2.controller';
import { Hl7v2Service } from './hl7v2.service';
import { Hl7v2Parser } from './hl7v2.parser';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [Hl7v2Controller],
  providers: [Hl7v2Service, Hl7v2Parser],
  exports: [Hl7v2Service, Hl7v2Parser],
})
export class Hl7v2Module {}
