import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQuery, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

    // Audit message access
    await this.auditService.log({
      action: 'MESSAGES_ACCESSED',
      entityType: 'MessageThread',
      entityId: threadId,
      userId,
      details: { messageCount: messages.length },
    });

    return new PaginatedResult(messages, total, query.page, query.limit);
  }

  async createThread(userId: string, dto: { subject: string; participantIds: string[]; patientId?: string }) {
    const thread = await this.prisma.messageThread.create({
      data: {
        subject: dto.subject,
        patientId: dto.patientId,
        participants: {
          create: [userId, ...dto.participantIds].map((uid) => ({ userId: uid })),
        },
      },
      include: { participants: true },
    });

    await this.auditService.log({
      action: 'MESSAGE_THREAD_CREATED',
      entityType: 'MessageThread',
      entityId: thread.id,
      userId,
      details: { subject: dto.subject, participantCount: dto.participantIds.length + 1 },
    });

    return thread;
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

    await this.auditService.log({
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: message.id,
      userId: senderId,
      details: { threadId, priority: dto.priority },
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
