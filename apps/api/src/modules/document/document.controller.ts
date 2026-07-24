import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DocumentService, UploadDocumentMeta, NewVersionMeta } from './document.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get()
  @ApiOperation({ summary: 'List patient documents' })
  @RequirePermissions('clinical:read')
  findAll(
    @Param('patientId') patientId: string,
    @Query() query: PaginationQuery & { categoryId?: string; status?: string; documentType?: string },
  ) {
    return this.documentService.findAll(patientId, query);
  }

  @Get('pending-review')
  @ApiOperation({ summary: 'Get documents pending review' })
  @RequirePermissions('clinical:read')
  getPendingReview(@Query() query: PaginationQuery) {
    return this.documentService.getPendingReview(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get document categories' })
  @RequirePermissions('clinical:read')
  getCategories() {
    return this.documentService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @RequirePermissions('clinical:read')
  findOne(@Param('id') id: string) {
    return this.documentService.findById(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  @RequirePermissions('clinical:read')
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.getDownloadUrl(id, user?.id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload document' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('clinical:write')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: UploadDocumentMeta,
    @CurrentUser() user: any,
  ) {
    return this.documentService.upload(patientId, user?.id, file, meta);
  }

  @Post(':id/version')
  @ApiOperation({ summary: 'Upload new version of document' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('clinical:write')
  @UseInterceptors(FileInterceptor('file'))
  createNewVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() meta: NewVersionMeta,
    @CurrentUser() user: any,
  ) {
    return this.documentService.createNewVersion(id, user?.id, file, meta);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update document status' })
  @RequirePermissions('clinical:write')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.documentService.updateStatus(id, dto.status, user?.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign document' })
  @RequirePermissions('clinical:write')
  sign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.sign(id, user?.id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share document with patient' })
  @RequirePermissions('clinical:write')
  shareWithPatient(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.shareWithPatient(id, user?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @RequirePermissions('clinical:write')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentService.remove(id, user?.id);
  }
}
