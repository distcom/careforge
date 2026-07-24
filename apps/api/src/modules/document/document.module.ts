import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { CcdaService } from './ccda.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DocumentController],
  providers: [DocumentService, CcdaService],
  exports: [DocumentService, CcdaService],
})
export class DocumentModule {}
