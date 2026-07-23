import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { CcdaService } from './ccda.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, CcdaService],
  exports: [DocumentService, CcdaService],
})
export class DocumentModule {}
