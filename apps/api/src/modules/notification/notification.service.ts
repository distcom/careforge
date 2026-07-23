import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getUserNotifications(userId: string, query: PaginationQuery & { unreadOnly?: boolean }): Promise<PaginatedResult<any>> {
    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip: query.skip, take: query.limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResult(notifications, total, query.page, query.limit);
  }

  async create(userId: string, dto: { type: string; title: string; body: string; data?: any }) {
    return this.prisma.notification.create({
      data: { userId, type: dto.type, title: dto.title, body: dto.body, data: dto.data },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async remove(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }
}
