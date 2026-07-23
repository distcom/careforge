import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CcdaService } from './ccda.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/documents')
export class DocumentController {
  constructor(
    private documentService: DocumentService,
    private ccdaService: CcdaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient documents' })
  @RequirePermissions('document:read')
  findAll(@Param('patientId') patientId: string, @Query() query: PaginationQuery & { categoryId?: string }) {
    return this.documentService.findAll(patientId, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get document categories' })
  getCategories() {
    return this.documentService.getCategories();
  }

  @Post()
  @ApiOperation({ summary: 'Upload document' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('document:write')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: { title: string; description?: string; categoryId?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentService.upload(patientId, user.id, file, meta);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  @RequirePermissions('document:read')
  getDownloadUrl(@Param('id') id: string) {
    return this.documentService.getDownloadUrl(id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign document' })
  @RequirePermissions('document:sign')
  sign(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentService.sign(id, user.id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share document with patient' })
  @RequirePermissions('document:write')
  share(@Param('id') id: string) {
    return this.documentService.shareWithPatient(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove document' })
  @RequirePermissions('document:delete')
  remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }

  @Get('ccda/ccd')
  @ApiOperation({ summary: 'Generate C-CDA CCD document for patient' })
  @RequirePermissions('document:read')
  async generateCCD(@Param('patientId') patientId: string, @Res() res: Response) {
    const xml = await this.ccdaService.generateCCD(patientId);
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="CCD_${patientId}.xml"`,
    });
    res.send(xml);
  }
}
