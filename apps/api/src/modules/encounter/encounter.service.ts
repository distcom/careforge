import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateEncounterDto, UpdateEncounterDto, SignEncounterDto } from './dto/encounter.dto';

export interface CreateClinicalNoteDto {
  encounterId: string;
  noteType: string;
  title?: string;
  content: string;
}

export interface AmendNoteDto {
  content: string;
  amendmentReason: string;
}

@Injectable()
export class EncounterService {
  private readonly logger = new Logger(EncounterService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery & { patientId?: string; providerId?: string; status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };

    if (query.patientId) where.patientId = query.patientId;
    if (query.providerId) where.providerId = query.providerId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { chiefComplaint: { contains: query.search, mode: 'insensitive' } },
        { assessment: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [encounters, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
          diagnoses: true,
          procedures: true,
          _count: { select: { clinicalNotes: true } },
        },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return new PaginatedResult(encounters, total, query.page, query.limit);
  }

  async findById(id: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        facility: { select: { id: true, name: true } },
        diagnoses: true,
        procedures: true,
        vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 5 },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            attestedBy: { select: { id: true, firstName: true, lastName: true } },
            amendments: {
              select: { id: true, content: true, amendmentReason: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  async create(dto: CreateEncounterDto, providerId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const encounter = await this.prisma.encounter.create({
      data: {
        patientId: dto.patientId,
        providerId,
        facilityId: dto.facilityId,
        appointmentId: dto.appointmentId,
        type: dto.type || 'OFFICE_VISIT',
        status: 'IN_PROGRESS',
        chiefComplaint: dto.chiefComplaint,
        hpi: dto.hpi,
        ros: dto.ros,
        physicalExam: dto.physicalExam,
        assessment: dto.assessment,
        plan: dto.plan,
        instructions: dto.instructions,
        startedAt: new Date(),
        diagnoses: dto.diagnoses?.length
          ? { create: dto.diagnoses }
          : undefined,
        procedures: dto.procedures?.length
          ? { create: dto.procedures }
          : undefined,
      },
      include: { diagnoses: true, procedures: true },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_STARTED',
      entityType: 'Encounter',
      entityId: encounter.id,
      userId: providerId,
      details: { patientId: dto.patientId, type: dto.type },
    });

    return encounter;
  }

  async update(id: string, dto: UpdateEncounterDto, userId?: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (['SIGNED', 'AMENDED', 'ENTERED_IN_ERROR'].includes(encounter.status)) {
      throw new BadRequestException(`Cannot modify a ${encounter.status.toLowerCase()} encounter. Use amendment workflow.`);
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: {
        chiefComplaint: dto.chiefComplaint,
        hpi: dto.hpi,
        ros: dto.ros,
        physicalExam: dto.physicalExam,
        assessment: dto.assessment,
        plan: dto.plan,
        instructions: dto.instructions,
      },
      include: { diagnoses: true, procedures: true },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_UPDATED',
      entityType: 'Encounter',
      entityId: id,
      userId,
      details: { fields: Object.keys(dto).filter(k => dto[k as keyof UpdateEncounterDto] !== undefined) },
    });

    return updated;
  }

  async sign(id: string, dto: SignEncounterDto, userId: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (encounter.status === 'SIGNED') {
      throw new BadRequestException('Encounter already signed');
    }

    if (encounter.status === 'ENTERED_IN_ERROR') {
      throw new BadRequestException('Cannot sign an encounter marked as entered in error');
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedById: userId,
        cosignedById: dto.cosignedById,
        cosignedAt: dto.cosignedById ? new Date() : null,
      },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_SIGNED',
      entityType: 'Encounter',
      entityId: id,
      userId,
      details: { cosignedById: dto.cosignedById },
    });

    this.logger.log(`Encounter signed: ${id} by ${userId}`);

    return updated;
  }

  async amend(id: string, reason: string, userId: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (encounter.status !== 'SIGNED') {
      throw new BadRequestException('Only signed encounters can be amended');
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: {
        status: 'AMENDED',
        amendedAt: new Date(),
        amendedById: userId,
        amendmentReason: reason,
      },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_AMENDED',
      entityType: 'Encounter',
      entityId: id,
      userId,
      details: { reason },
    });

    return updated;
  }

  async markEnteredInError(id: string, reason: string, userId: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: {
        status: 'ENTERED_IN_ERROR',
        enteredInErrorAt: new Date(),
        enteredInErrorById: userId,
        enteredInErrorReason: reason,
      },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_ENTERED_IN_ERROR',
      entityType: 'Encounter',
      entityId: id,
      userId,
      details: { reason },
    });

    return updated;
  }

  // Clinical Notes
  async createNote(dto: CreateClinicalNoteDto, authorId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: dto.encounterId, deletedAt: null },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const note = await this.prisma.clinicalNote.create({
      data: {
        encounterId: dto.encounterId,
        authorId,
        noteType: dto.noteType,
        title: dto.title,
        content: dto.content,
        status: 'DRAFT',
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      action: 'CLINICAL_NOTE_CREATED',
      entityType: 'ClinicalNote',
      entityId: note.id,
      userId: authorId,
      details: { encounterId: dto.encounterId, noteType: dto.noteType },
    });

    return note;
  }

  async finalizeNote(noteId: string, userId: string) {
    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    if (note.status !== 'DRAFT') {
      throw new BadRequestException('Only draft notes can be finalized');
    }

    // Only author can finalize
    if (note.authorId !== userId) {
      throw new ForbiddenException('Only the author can finalize this note');
    }

    const updated = await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        status: 'FINAL',
        attestedAt: new Date(),
        attestedById: userId,
      },
    });

    await this.auditService.log({
      action: 'CLINICAL_NOTE_FINALIZED',
      entityType: 'ClinicalNote',
      entityId: noteId,
      userId,
    });

    return updated;
  }

  async amendNote(noteId: string, dto: AmendNoteDto, userId: string) {
    const originalNote = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!originalNote) throw new NotFoundException('Note not found');

    if (originalNote.status !== 'FINAL') {
      throw new BadRequestException('Only finalized notes can be amended');
    }

    // Create amendment as new note (non-destructive)
    const amendment = await this.prisma.clinicalNote.create({
      data: {
        encounterId: originalNote.encounterId,
        authorId: userId,
        noteType: originalNote.noteType,
        title: originalNote.title ? `${originalNote.title} (Amendment)` : 'Amendment',
        content: dto.content,
        status: 'FINAL',
        isAmendment: true,
        amendsNoteId: noteId,
        amendmentReason: dto.amendmentReason,
        attestedAt: new Date(),
        attestedById: userId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Mark original as amended
    await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: { status: 'AMENDED' },
    });

    await this.auditService.log({
      action: 'CLINICAL_NOTE_AMENDED',
      entityType: 'ClinicalNote',
      entityId: amendment.id,
      userId,
      details: { originalNoteId: noteId, reason: dto.amendmentReason },
    });

    return amendment;
  }

  async addDiagnosis(encounterId: string, dto: { icd10Code: string; description: string; isPrimary?: boolean }, userId?: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const diagnosis = await this.prisma.encounterDiagnosis.create({
      data: { encounterId, ...dto },
    });

    await this.auditService.log({
      action: 'DIAGNOSIS_ADDED',
      entityType: 'EncounterDiagnosis',
      entityId: diagnosis.id,
      userId,
      details: { encounterId, icd10Code: dto.icd10Code },
    });

    return diagnosis;
  }

  async addProcedure(encounterId: string, dto: { cptCode: string; description: string; modifiers?: string; units?: number; fee?: number }, userId?: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const procedure = await this.prisma.encounterProcedure.create({
      data: { encounterId, ...dto },
    });

    await this.auditService.log({
      action: 'PROCEDURE_ADDED',
      entityType: 'EncounterProcedure',
      entityId: procedure.id,
      userId,
      details: { encounterId, cptCode: dto.cptCode },
    });

    return procedure;
  }

  async remove(id: string, userId?: string) {
    const encounter = await this.prisma.encounter.findFirst({ where: { id, deletedAt: null } });
    if (!encounter) throw new NotFoundException('Encounter not found');

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      action: 'ENCOUNTER_DELETED',
      entityType: 'Encounter',
      entityId: id,
      userId,
    });

    return updated;
  }
}
