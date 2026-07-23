import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { categoryId?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.categoryId) where.categoryId = query.categoryId;

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          uploader: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);
    return new PaginatedResult(documents, total, query.page, query.limit);
  }

  async upload(
    patientId: string,
    uploadedById: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: { title: string; description?: string; categoryId?: string },
  ) {
    const uploaded = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `patients/${patientId}/documents`,
    );

    return this.prisma.clinicalDocument.create({
      data: {
        patientId,
        uploadedById,
        categoryId: meta.categoryId,
        title: meta.title,
        description: meta.description,
        fileName: file.originalname,
        fileKey: uploaded.key,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });
  }

  async getDownloadUrl(id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.getPresignedUrl(doc.fileKey);
    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async sign(id: string, signedById: string) {
    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { status: 'signed', signedAt: new Date(), signedById },
    });
  }

  async shareWithPatient(id: string) {
    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { sharedWithPatient: true, status: 'shared' },
    });
  }

  async remove(id: string) {
    await this.prisma.clinicalDocument.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Document removed' };
  }

  async getCategories() {
    return this.prisma.documentCategory.findMany({ where: { isActive: true } });
  }
}
