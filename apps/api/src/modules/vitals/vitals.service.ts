import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
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
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.vitalSign.create({
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

  async remove(id: string) {
    await this.prisma.vitalSign.delete({ where: { id } });
    return { message: 'Vital sign record deleted' };
  }
}
