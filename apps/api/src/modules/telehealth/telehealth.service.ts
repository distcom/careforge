import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TelehealthService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { skip?: number; take?: number; patientId?: string; providerId?: string; status?: string }) {
    const where: any = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.providerId) where.providerId = query.providerId;
    if (query.status) where.status = query.status;

    const [sessions, total] = await Promise.all([
      this.prisma.telehealthSession.findMany({
        where,
        skip: query.skip || 0,
        take: query.take || 20,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.telehealthSession.count({ where }),
    ]);
    return { data: sessions, total, page: Math.floor((query.skip || 0) / (query.take || 20)) + 1 };
  }

  async findById(id: string) {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id },
      include: { patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async createSession(dto: { appointmentId?: string; patientId?: string; providerId?: string; scheduledAt?: string }) {
    const roomCode = `CF-${uuidv4().slice(0, 8).toUpperCase()}`;
    return this.prisma.telehealthSession.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        providerId: dto.providerId,
        roomCode,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
      },
    });
  }

  async getSessionByRoom(roomCode: string) {
    const session = await this.prisma.telehealthSession.findUnique({ where: { roomCode } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateSessionStatus(id: string, status: string) {
    const data: any = { status };
    if (status === 'active') data.startedAt = new Date();
    if (status === 'completed') data.endedAt = new Date();
    return this.prisma.telehealthSession.update({ where: { id }, data });
  }

  async getPatientSessions(patientId: string) {
    return this.prisma.telehealthSession.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
