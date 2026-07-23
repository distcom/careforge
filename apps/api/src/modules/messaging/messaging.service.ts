import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async getThreads(userId: string, query: PaginationQuery): Promise<PaginatedResult<any>> {
    const where = {
      participants: { some: { userId } },
      status: { not: 'archived' },
    };

    const [threads, total] = await Promise.all([
      this.prisma.messageThread.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          participants: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          patient: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.messageThread.count({ where }),
    ]);
    return new PaginatedResult(threads, total, query.page, query.limit);
  }

  async getThreadMessages(threadId: string, userId: string, query: PaginationQuery) {
    const thread = await this.prisma.messageThread.findFirst({
      where: { id: threadId, participants: { some: { userId } } },
    });
    if (!thread) throw new NotFoundException('Thread not found');

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { threadId, deletedAt: null },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.message.count({ where: { threadId, deletedAt: null } }),
    ]);

    // Mark as read
    await this.prisma.message.updateMany({
      where: { threadId, isRead: false, senderId: { not: userId } },
      data: { isRead: true, readAt: new Date() },
    });

    return new PaginatedResult(messages, total, query.page, query.limit);
  }

  async createThread(userId: string, dto: { subject: string; participantIds: string[]; patientId?: string }) {
    return this.prisma.messageThread.create({
      data: {
        subject: dto.subject,
        patientId: dto.patientId,
        participants: {
          create: [userId, ...dto.participantIds].map((uid) => ({ userId: uid })),
        },
      },
      include: { participants: true },
    });
  }

  async sendMessage(threadId: string, senderId: string, dto: { body: string; priority?: string }) {
    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId,
        body: dto.body,
        priority: dto.priority || 'normal',
      },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });

    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getUnreadCount(userId: string) {
    return this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        deletedAt: null,
        thread: { participants: { some: { userId } } },
      },
    });
  }
}
