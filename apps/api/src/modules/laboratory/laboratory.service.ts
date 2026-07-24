import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Hl7Service } from './hl7.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

export interface CreateLabOrderDto {
  patientId: string;
  providerId: string;
  encounterId?: string;
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
  isCritical?: boolean;
}

@Injectable()
export class LaboratoryService {
  private readonly logger = new Logger(LaboratoryService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
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

  async create(dto: CreateLabOrderDto, userId?: string) {
    const orderNumber = `LAB-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const order = await this.prisma.labOrder.create({
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

    await this.auditService.log({
      action: 'LAB_ORDER_CREATED',
      entityType: 'LabOrder',
      entityId: order.id,
      userId,
      details: {
        patientId: dto.patientId,
        orderNumber,
        itemCount: dto.items.length,
      },
    });

    this.logger.log(`Lab order created: ${orderNumber} for patient ${dto.patientId}`);

    return order;
  }

  async updateStatus(id: string, status: string, userId?: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    const data: any = { status };
    if (status === 'COLLECTED') data.collectedAt = new Date();
    if (status === 'RESULTED') data.resultedAt = new Date();
    if (status === 'REVIEWED') data.reviewedAt = new Date();
    if (status === 'CANCELLED') data.cancelledAt = new Date();

    const updated = await this.prisma.labOrder.update({ where: { id }, data, include: { items: true } });

    await this.auditService.log({
      action: `LAB_ORDER_${status}`,
      entityType: 'LabOrder',
      entityId: id,
      userId,
      details: { patientId: order.patientId, orderNumber: order.orderNumber },
    });

    return updated;
  }

  async cancel(id: string, reason: string, userId?: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    if (['RESULTED', 'REVIEWED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in ${order.status} status`);
    }

    const updated = await this.prisma.labOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });

    await this.auditService.log({
      action: 'LAB_ORDER_CANCELLED',
      entityType: 'LabOrder',
      entityId: id,
      userId,
      details: { patientId: order.patientId, reason },
    });

    return updated;
  }

  async enterResult(orderId: string, itemId: string, dto: ResultEntryDto, userId?: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Lab order not found');

    const item = await this.prisma.labOrderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Lab order item not found');

    const updated = await this.prisma.labOrderItem.update({
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

    // Check for critical results
    if (dto.isCritical || dto.flag === 'CRITICAL') {
      await this.auditService.log({
        action: 'CRITICAL_LAB_RESULT',
        entityType: 'LabOrderItem',
        entityId: itemId,
        userId,
        details: {
          patientId: order.patientId,
          testName: item.testName,
          result: dto.result,
          flag: dto.flag,
        },
      });
      this.logger.warn(`CRITICAL LAB RESULT: ${item.testName} for patient ${order.patientId}`);
    }

    await this.auditService.log({
      action: 'LAB_RESULT_ENTERED',
      entityType: 'LabOrderItem',
      entityId: itemId,
      userId,
      details: { patientId: order.patientId, testName: item.testName },
    });

    return updated;
  }

  async reviewOrder(id: string, reviewerId: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    await this.prisma.labOrderItem.updateMany({
      where: { labOrderId: id },
      data: { status: 'reviewed' },
    });

    const updated = await this.prisma.labOrder.update({
      where: { id },
      data: { status: 'REVIEWED', reviewedAt: new Date(), reviewedById: reviewerId },
    });

    await this.auditService.log({
      action: 'LAB_ORDER_REVIEWED',
      entityType: 'LabOrder',
      entityId: id,
      userId: reviewerId,
      details: { patientId: order.patientId, orderNumber: order.orderNumber },
    });

    return updated;
  }

  async acknowledgeCriticalResult(itemId: string, userId: string, notes?: string) {
    const item = await this.prisma.labOrderItem.findUnique({
      where: { id: itemId },
      include: { labOrder: { select: { patientId: true, orderNumber: true } } },
    });
    if (!item) throw new NotFoundException('Lab result not found');

    // Mark as acknowledged (would need schema field, using notes for now)
    await this.auditService.log({
      action: 'CRITICAL_RESULT_ACKNOWLEDGED',
      entityType: 'LabOrderItem',
      entityId: itemId,
      userId,
      details: {
        patientId: item.labOrder.patientId,
        testName: item.testName,
        notes,
      },
    });

    return { acknowledged: true, itemId };
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
