import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    isBreakGlass?: boolean;
  }) {
    return this.prisma.auditLog.create({ data: dto });
  }

  async findAll(query: PaginationQuery & { userId?: string; entityType?: string; action?: string; dateFrom?: string; dateTo?: string }): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.action) where.action = query.action;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return new PaginatedResult(logs, total, query.page, query.limit);
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  }
}
