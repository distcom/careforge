import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';

@Module({
  imports: [PrismaModule],
  controllers: [FhirController],
  providers: [FhirService],
})
export class FhirModule {}
