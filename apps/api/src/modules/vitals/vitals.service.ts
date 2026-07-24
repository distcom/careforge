import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

export interface CreateVitalsDto {
  patientId: string;
  encounterId?: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  temperature?: number;
  tempUnit?: string;
  respiratoryRate?: number;
  oxygenSat?: number;
  height?: number;
  weight?: number;
  headCircumference?: number;
  waistCircumference?: number;
  painScale?: number;
  notes?: string;
  recordedById?: string;
}

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(patientId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = { patientId };

    const [vitals, total] = await Promise.all([
      this.prisma.vitalSign.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.vitalSign.count({ where }),
    ]);

    return new PaginatedResult(vitals, total, query.page, query.limit);
  }

  async create(dto: CreateVitalsDto) {
    // Auto-calculate BMI if height and weight provided
    let bmi: number | undefined;
    if (dto.height && dto.weight && dto.height > 0) {
      const heightM = dto.height / 100;
      bmi = Math.round((dto.weight / (heightM * heightM)) * 10) / 10;
    }

    const vitals = await this.prisma.vitalSign.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        systolic: dto.systolic,
        diastolic: dto.diastolic,
        heartRate: dto.heartRate,
        temperature: dto.temperature,
        tempUnit: dto.tempUnit || 'F',
        respiratoryRate: dto.respiratoryRate,
        oxygenSat: dto.oxygenSat,
        height: dto.height,
        weight: dto.weight,
        bmi,
        headCircumference: dto.headCircumference,
        waistCircumference: dto.waistCircumference,
        painScale: dto.painScale,
        notes: dto.notes,
        recordedById: dto.recordedById,
      },
    });

    await this.auditService.log({
      action: 'VITALS_RECORDED',
      entityType: 'VitalSign',
      entityId: vitals.id,
      userId: dto.recordedById,
      details: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        hasBP: !!(dto.systolic && dto.diastolic),
        hasTemp: !!dto.temperature,
        hasWeight: !!dto.weight,
      },
    });

    // Log abnormal vitals
    if (this.isAbnormalVitals(dto)) {
      this.logger.warn(`Abnormal vitals recorded for patient ${dto.patientId}`);
      await this.auditService.log({
        action: 'ABNORMAL_VITALS_RECORDED',
        entityType: 'VitalSign',
        entityId: vitals.id,
        userId: dto.recordedById,
        details: { patientId: dto.patientId },
      });
    }

    return vitals;
  }

  private isAbnormalVitals(dto: CreateVitalsDto): boolean {
    // Basic abnormal vital detection
    if (dto.systolic && (dto.systolic > 180 || dto.systolic < 90)) return true;
    if (dto.diastolic && (dto.diastolic > 120 || dto.diastolic < 60)) return true;
    if (dto.heartRate && (dto.heartRate > 120 || dto.heartRate < 50)) return true;
    if (dto.temperature && (dto.temperature > 103 || dto.temperature < 95)) return true;
    if (dto.oxygenSat && dto.oxygenSat < 90) return true;
    if (dto.respiratoryRate && (dto.respiratoryRate > 30 || dto.respiratoryRate < 8)) return true;
    return false;
  }

  async getLatest(patientId: string) {
    return this.prisma.vitalSign.findFirst({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async getTrends(patientId: string, metric: string, limit: number = 20) {
    const validMetrics = ['systolic', 'diastolic', 'heartRate', 'temperature', 'respiratoryRate', 'oxygenSat', 'weight', 'bmi'];
    if (!validMetrics.includes(metric)) {
      throw new NotFoundException(`Invalid metric: ${metric}`);
    }

    const records = await this.prisma.vitalSign.findMany({
      where: { patientId, [metric]: { not: null } },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: { id: true, recordedAt: true, [metric]: true },
    });

    return records.reverse();
  }

  async remove(id: string, userId?: string) {
    const vitals = await this.prisma.vitalSign.findUnique({ where: { id } });
    if (!vitals) throw new NotFoundException('Vital sign record not found');

    await this.prisma.vitalSign.delete({ where: { id } });

    await this.auditService.log({
      action: 'VITALS_DELETED',
      entityType: 'VitalSign',
      entityId: id,
      userId,
      details: { patientId: vitals.patientId },
    });

    return { message: 'Vital sign record deleted' };
  }
}
