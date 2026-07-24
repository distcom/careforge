import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateProcedureDto {
  patientId: string;
  encounterId?: string;
  cptCode?: string;
  icd10Codes?: string;
  name: string;
  description?: string;
  status?: string;
  scheduledAt?: string;
  performedAt?: string;
  performedById?: string;
  orderedById?: string;
  assistantIds?: string;
  facility?: string;
  location?: string;
  preOpNotes?: string;
  postOpNotes?: string;
  operativeNotes?: string;
  complications?: string;
  anesthesia?: string;
  anesthesiaType?: string;
  laterality?: string;
  specimenCollected?: boolean;
  specimenNotes?: string;
  pathologyOrdered?: boolean;
  estimatedDuration?: number;
  notes?: string;
}

// Valid procedure status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'POSTPONED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['SCHEDULED'], // Allow rescheduling
  POSTPONED: ['SCHEDULED', 'CANCELLED'],
};

@Injectable()
export class ProcedureService {
  private readonly logger = new Logger(ProcedureService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery & { status?: string }): Promise<PaginatedResult<any>> {
    const where: any = { patientId, deletedAt: null };
    if (query.status) where.status = query.status;

    const [procedures, total] = await Promise.all([
      this.prisma.procedure.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { firstName: true, lastName: true } },
          orderedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.procedure.count({ where }),
    ]);
    return new PaginatedResult(procedures, total, query.page, query.limit);
  }

  async findById(id: string) {
    const procedure = await this.prisma.procedure.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true } },
        performedBy: { select: { firstName: true, lastName: true, email: true } },
        orderedBy: { select: { firstName: true, lastName: true } },
        encounter: { select: { id: true, type: true, status: true } },
      },
    });
    if (!procedure) throw new NotFoundException('Procedure not found');
    return procedure;
  }

  async create(dto: CreateProcedureDto, userId?: string) {
    const procedure = await this.prisma.procedure.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        cptCode: dto.cptCode,
        icd10Codes: dto.icd10Codes,
        name: dto.name,
        description: dto.description,
        status: dto.status || 'SCHEDULED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : null,
        performedById: dto.performedById,
        orderedById: dto.orderedById || userId,
        assistantIds: dto.assistantIds,
        facility: dto.facility,
        location: dto.location,
        preOpNotes: dto.preOpNotes,
        postOpNotes: dto.postOpNotes,
        operativeNotes: dto.operativeNotes,
        complications: dto.complications,
        anesthesia: dto.anesthesia,
        anesthesiaType: dto.anesthesiaType,
        laterality: dto.laterality,
        specimenCollected: dto.specimenCollected || false,
        specimenNotes: dto.specimenNotes,
        pathologyOrdered: dto.pathologyOrdered || false,
        estimatedDuration: dto.estimatedDuration,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      action: 'PROCEDURE_SCHEDULED',
      entityType: 'Procedure',
      entityId: procedure.id,
      userId: dto.orderedById || userId,
      details: {
        patientId: dto.patientId,
        name: dto.name,
        cptCode: dto.cptCode,
        scheduledAt: dto.scheduledAt,
      },
    });

    return procedure;
  }

  async updateStatus(id: string, status: string, userId?: string, reason?: string) {
    const procedure = await this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
    if (!procedure) throw new NotFoundException('Procedure not found');

    const allowedTransitions = STATUS_TRANSITIONS[procedure.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition procedure from ${procedure.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    const data: any = { status };

    if (status === 'IN_PROGRESS') {
      data.performedAt = new Date();
    } else if (status === 'COMPLETED') {
      data.completedAt = new Date();
      // Calculate actual duration if started
      if (procedure.performedAt) {
        data.actualDuration = Math.round((Date.now() - procedure.performedAt.getTime()) / 60000);
      }
    } else if (status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelReason = reason;
    }

    const updated = await this.prisma.procedure.update({ where: { id }, data });

    await this.auditService.log({
      action: `PROCEDURE_${status}`,
      entityType: 'Procedure',
      entityId: id,
      userId,
      details: {
        patientId: procedure.patientId,
        name: procedure.name,
        previousStatus: procedure.status,
        reason,
      },
    });

    return updated;
  }

  async update(id: string, dto: Partial<CreateProcedureDto> & { actualDuration?: number }, userId?: string) {
    const procedure = await this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
    if (!procedure) throw new NotFoundException('Procedure not found');

    const data: any = { ...dto };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.performedAt) data.performedAt = new Date(dto.performedAt);

    const updated = await this.prisma.procedure.update({ where: { id }, data });

    await this.auditService.log({
      action: 'PROCEDURE_UPDATED',
      entityType: 'Procedure',
      entityId: id,
      userId,
      details: { patientId: procedure.patientId, name: procedure.name },
    });

    return updated;
  }

  async recordCompletion(
    id: string,
    dto: {
      operativeNotes?: string;
      postOpNotes?: string;
      complications?: string;
      specimenCollected?: boolean;
      specimenNotes?: string;
      pathologyOrdered?: boolean;
      actualDuration?: number;
    },
    userId?: string,
  ) {
    const procedure = await this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
    if (!procedure) throw new NotFoundException('Procedure not found');

    if (procedure.status === 'COMPLETED') {
      throw new BadRequestException('Procedure already completed');
    }

    const updated = await this.prisma.procedure.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        operativeNotes: dto.operativeNotes,
        postOpNotes: dto.postOpNotes,
        complications: dto.complications,
        specimenCollected: dto.specimenCollected,
        specimenNotes: dto.specimenNotes,
        pathologyOrdered: dto.pathologyOrdered,
        actualDuration: dto.actualDuration,
      },
    });

    await this.auditService.log({
      action: 'PROCEDURE_COMPLETED',
      entityType: 'Procedure',
      entityId: id,
      userId,
      details: {
        patientId: procedure.patientId,
        name: procedure.name,
        hasComplications: !!dto.complications,
        specimenCollected: dto.specimenCollected,
      },
    });

    // Log if complications occurred
    if (dto.complications) {
      this.logger.warn(`Procedure ${id} completed with complications: ${dto.complications}`);
      await this.auditService.log({
        action: 'PROCEDURE_COMPLICATION',
        entityType: 'Procedure',
        entityId: id,
        userId,
        details: {
          patientId: procedure.patientId,
          name: procedure.name,
          complications: dto.complications,
        },
      });
    }

    return updated;
  }

  async getScheduledProcedures(query: PaginationQuery & { date?: string }) {
    const where: any = {
      deletedAt: null,
      status: { in: ['SCHEDULED', 'POSTPONED'] },
    };

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: startOfDay, lte: endOfDay };
    }

    const [procedures, total] = await Promise.all([
      this.prisma.procedure.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          performedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.procedure.count({ where }),
    ]);

    return new PaginatedResult(procedures, total, query.page, query.limit);
  }

  async remove(id: string, userId?: string) {
    const procedure = await this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
    if (!procedure) throw new NotFoundException('Procedure not found');

    await this.prisma.procedure.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      action: 'PROCEDURE_DELETED',
      entityType: 'Procedure',
      entityId: id,
      userId,
      details: { patientId: procedure.patientId, name: procedure.name },
    });

    return { message: 'Procedure removed' };
  }
}
