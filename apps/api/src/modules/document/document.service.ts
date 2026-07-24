import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface UploadDocumentMeta {
  title: string;
  description?: string;
  categoryId?: string;
  documentType?: string;
  encounterId?: string;
  sourceFacility?: string;
  sourceProvider?: string;
}

export interface NewVersionMeta {
  title?: string;
  description?: string;
  versionNote?: string;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { categoryId?: string; status?: string; documentType?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.documentType) where.documentType = query.documentType;

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          uploadedBy: { select: { firstName: true, lastName: true } },
          signedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);
    return new PaginatedResult(documents, total, query.page, query.limit);
  }

  async findById(id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        category: { select: { id: true, name: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
        signedBy: { select: { firstName: true, lastName: true } },
        encounter: { select: { id: true, type: true, status: true } },
        versions: { select: { id: true, version: true, createdAt: true, versionNote: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async upload(
    patientId: string,
    uploadedById: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: UploadDocumentMeta,
  ) {
    const uploaded = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `patients/${patientId}/documents`,
    );

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId,
        uploadedById,
        categoryId: meta.categoryId,
        documentType: meta.documentType,
        encounterId: meta.encounterId,
        title: meta.title,
        description: meta.description,
        fileName: file.originalname,
        fileKey: uploaded.key,
        mimeType: file.mimetype,
        fileSize: file.size,
        sourceFacility: meta.sourceFacility,
        sourceProvider: meta.sourceProvider,
        receivedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      action: 'DOCUMENT_UPLOADED',
      entityType: 'ClinicalDocument',
      entityId: doc.id,
      userId: uploadedById,
      details: {
        patientId,
        title: meta.title,
        documentType: meta.documentType,
        fileName: file.originalname,
        fileSize: file.size,
      },
    });

    return doc;
  }

  async createNewVersion(
    id: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: NewVersionMeta,
  ) {
    const existingDoc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!existingDoc) throw new NotFoundException('Document not found');

    // Upload new file
    const uploaded = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `patients/${existingDoc.patientId}/documents`,
    );

    // Mark previous version as obsolete
    await this.prisma.clinicalDocument.update({
      where: { id },
      data: { status: 'OBSOLETE' },
    });

    // Create new version
    const newVersion = await this.prisma.clinicalDocument.create({
      data: {
        patientId: existingDoc.patientId,
        encounterId: existingDoc.encounterId,
        categoryId: existingDoc.categoryId,
        documentType: existingDoc.documentType,
        title: meta.title || existingDoc.title,
        description: meta.description || existingDoc.description,
        fileName: file.originalname,
        fileKey: uploaded.key,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedById: userId,
        version: existingDoc.version + 1,
        previousVersionId: id,
        versionNote: meta.versionNote,
        status: 'ACTIVE',
      },
    });

    await this.auditService.log({
      action: 'DOCUMENT_VERSION_CREATED',
      entityType: 'ClinicalDocument',
      entityId: newVersion.id,
      userId,
      details: {
        patientId: existingDoc.patientId,
        title: newVersion.title,
        version: newVersion.version,
        previousVersionId: id,
      },
    });

    return newVersion;
  }

  async getDownloadUrl(id: string, userId?: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    const url = await this.storage.getPresignedUrl(doc.fileKey);

    await this.auditService.log({
      action: 'DOCUMENT_ACCESSED',
      entityType: 'ClinicalDocument',
      entityId: id,
      userId,
      details: { patientId: doc.patientId, title: doc.title },
    });

    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async updateStatus(id: string, status: string, userId?: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'FINAL', 'SIGNED', 'AMENDED', 'OBSOLETE'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const data: any = { status };

    if (status === 'SIGNED') {
      data.signedById = userId;
      data.signedAt = new Date();
    } else if (status === 'FINAL') {
      data.reviewedById = userId;
      data.reviewedAt = new Date();
    }

    const updated = await this.prisma.clinicalDocument.update({ where: { id }, data });

    await this.auditService.log({
      action: `DOCUMENT_${status}`,
      entityType: 'ClinicalDocument',
      entityId: id,
      userId,
      details: { patientId: doc.patientId, title: doc.title, previousStatus: doc.status },
    });

    return updated;
  }

  async sign(id: string, signedById: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    const updated = await this.prisma.clinicalDocument.update({
      where: { id },
      data: { status: 'SIGNED', signedAt: new Date(), signedById },
    });

    await this.auditService.log({
      action: 'DOCUMENT_SIGNED',
      entityType: 'ClinicalDocument',
      entityId: id,
      userId: signedById,
      details: { patientId: doc.patientId, title: doc.title },
    });

    return updated;
  }

  async shareWithPatient(id: string, userId?: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    const updated = await this.prisma.clinicalDocument.update({
      where: { id },
      data: { sharedWithPatient: true, sharedAt: new Date() },
    });

    await this.auditService.log({
      action: 'DOCUMENT_SHARED_WITH_PATIENT',
      entityType: 'ClinicalDocument',
      entityId: id,
      userId,
      details: { patientId: doc.patientId, title: doc.title },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.clinicalDocument.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      action: 'DOCUMENT_DELETED',
      entityType: 'ClinicalDocument',
      entityId: id,
      userId,
      details: { patientId: doc.patientId, title: doc.title },
    });

    return { message: 'Document removed' };
  }

  async getCategories() {
    return this.prisma.documentCategory.findMany({ where: { isActive: true } });
  }

  async getPendingReview(query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { status: 'PENDING_REVIEW', deletedAt: null };

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'asc' },
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return new PaginatedResult(documents, total, query.page, query.limit);
  }
}
