import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Hl7Service } from './hl7.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CreateLabOrderDto {
  patientId: string;
  providerId: string;
  priority?: string;
  clinicalInfo?: string;
  fastingRequired?: boolean;
  notes?: string;
  items: { loincCode?: string; testName: string }[];
}

export interface ResultEntryDto {
  result?: string;
  resultValue?: number;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}

@Injectable()
export class LaboratoryService {
  constructor(
    private prisma: PrismaService,
    private hl7Service: Hl7Service,
  ) {}

  async findAll(query: PaginationQuery & { patientId?: string; status?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      this.prisma.labOrder.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { orderedAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
          items: true,
          _count: { select: { specimens: true } },
        },
      }),
      this.prisma.labOrder.count({ where }),
    ]);
    return new PaginatedResult(orders, total, query.page, query.limit);
  }

  async findById(id: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        specimens: true,
      },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  async create(dto: CreateLabOrderDto) {
    const orderNumber = `LAB-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    return this.prisma.labOrder.create({
      data: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        orderNumber,
        priority: dto.priority || 'routine',
        clinicalInfo: dto.clinicalInfo,
        fastingRequired: dto.fastingRequired ?? false,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            loincCode: item.loincCode,
            testName: item.testName,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    const data: any = { status };
    if (status === 'COLLECTED') data.collectedAt = new Date();
    if (status === 'RESULTED') data.resultedAt = new Date();
    if (status === 'REVIEWED') data.reviewedAt = new Date();

    return this.prisma.labOrder.update({ where: { id }, data, include: { items: true } });
  }

  async enterResult(orderId: string, itemId: string, dto: ResultEntryDto) {
    return this.prisma.labOrderItem.update({
      where: { id: itemId },
      data: {
        result: dto.result,
        resultValue: dto.resultValue,
        unit: dto.unit,
        referenceRange: dto.referenceRange,
        flag: dto.flag,
        status: 'resulted',
        resultedAt: new Date(),
      },
    });
  }

  async reviewOrder(id: string, reviewerId: string) {
    await this.prisma.labOrderItem.updateMany({
      where: { labOrderId: id },
      data: { status: 'reviewed' },
    });
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: 'REVIEWED', reviewedAt: new Date(), reviewedById: reviewerId },
    });
  }

  async getPatientLabHistory(patientId: string, query: PaginationQuery) {
    return this.findAll({ ...query, patientId });
  }

  async generateHl7Order(id: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true, gender: true } },
        provider: { select: { firstName: true, lastName: true } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Lab order not found');

    const item = order.items[0];
    const hl7 = this.hl7Service.generateORMMessage({
      patientId: order.patientId,
      patientName: `${order.patient.firstName} ${order.patient.lastName}`,
      patientDob: order.patient.dateOfBirth.toISOString(),
      patientGender: order.patient.gender,
      testCode: item?.loincCode || order.testCode || 'LAB',
      testName: item?.testName || order.testName || 'Lab Order',
      priority: order.priority,
      orderId: order.id,
      providerName: order.provider ? `${order.provider.firstName} ${order.provider.lastName}` : 'Unknown',
    });

    return { orderId: order.id, hl7Message: hl7 };
  }
}
