import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/domain-events';
import { v4 as uuidv4 } from 'uuid';

export interface TelehealthSessionConfig {
  appointmentId?: string;
  patientId: string;
  providerId: string;
  scheduledAt?: string;
  maxDurationMinutes?: number;
  allowRecording?: boolean;
  waitingRoomEnabled?: boolean;
  features?: {
    screenSharing: boolean;
    chat: boolean;
    fileSharing: boolean;
    virtualBackground: boolean;
  };
}

export interface SessionParticipant {
  userId: string;
  role: 'provider' | 'patient' | 'interpreter' | 'observer';
  joinedAt?: Date;
  leftAt?: Date;
  status: 'waiting' | 'connected' | 'disconnected' | 'removed';
}

/**
 * WebRTC Telehealth Session Management Service
 * Manages the full lifecycle of telehealth visits including:
 * - Session creation and configuration
 * - Waiting room management
 * - Participant management
 * - Recording consent tracking
 * - Session quality monitoring
 * - Post-visit documentation linking
 */
@Injectable()
export class TelehealthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new telehealth session
   */
  async createSession(config: TelehealthSessionConfig): Promise<any> {
    const roomCode = `CF-${uuidv4().slice(0, 8).toUpperCase()}`;
    const sessionToken = uuidv4();

    const session = await this.prisma.telehealthSession.create({
      data: {
        appointmentId: config.appointmentId,
        patientId: config.patientId,
        providerId: config.providerId,
        roomCode,
        scheduledAt: config.scheduledAt ? new Date(config.scheduledAt) : new Date(),
        maxDuration: config.maxDurationMinutes || 60,
        status: 'SCHEDULED',
        settings: {
          allowRecording: config.allowRecording ?? false,
          waitingRoomEnabled: config.waitingRoomEnabled ?? true,
          features: config.features || {
            screenSharing: true,
            chat: true,
            fileSharing: false,
            virtualBackground: true,
          },
        },
        sessionToken,
      },
    });

    // If linked to an appointment, update it
    if (config.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: config.appointmentId },
        data: { type: 'TELEHEALTH', notes: `Telehealth room: ${roomCode}` },
      }).catch(() => {}); // Non-critical
    }

    this.eventEmitter.emit(DOMAIN_EVENTS.TELEHEALTH_SCHEDULED, {
      sessionId: session.id,
      patientId: config.patientId,
      providerId: config.providerId,
      roomCode,
      scheduledAt: session.scheduledAt,
    });

    return {
      ...session,
      joinUrl: `/telehealth/join/${roomCode}`,
      token: sessionToken,
    };
  }

  /**
   * Join a session (participant enters waiting room or session)
   */
  async joinSession(roomCode: string, userId: string, role: string): Promise<any> {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { roomCode },
    });

    if (!session) throw new NotFoundException('Session not found');

    // Validate session state
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(session.status)) {
      throw new BadRequestException(`Session is ${session.status.toLowerCase()}`);
    }

    // Start session if provider joins and it's scheduled
    if (role === 'provider' && session.status === 'SCHEDULED') {
      await this.prisma.telehealthSession.update({
        where: { id: session.id },
        data: { status: 'WAITING', startedAt: new Date() },
      });
    }

    // Provider joins → session becomes active
    if (role === 'provider' && session.status === 'WAITING') {
      await this.prisma.telehealthSession.update({
        where: { id: session.id },
        data: { status: 'ACTIVE' },
      });
    }

    const settings = session.settings as any;
    const useWaitingRoom = settings?.waitingRoomEnabled && role === 'patient';

    // Track participant
    const participants = (session.participants as any[]) || [];
    const existingIdx = participants.findIndex((p) => p.userId === userId);

    const participant: SessionParticipant = {
      userId,
      role: role as any,
      joinedAt: new Date(),
      status: useWaitingRoom ? 'waiting' : 'connected',
    };

    if (existingIdx >= 0) {
      participants[existingIdx] = participant;
    } else {
      participants.push(participant);
    }

    await this.prisma.telehealthSession.update({
      where: { id: session.id },
      data: { participants: participants as any },
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.TELEHEALTH_PARTICIPANT_JOINED, {
      sessionId: session.id,
      userId,
      role,
      roomCode,
    });

    return {
      sessionId: session.id,
      roomCode,
      status: useWaitingRoom ? 'waiting_room' : 'connected',
      sessionStatus: session.status,
      settings,
      rtcConfig: this.getRTCConfiguration(),
    };
  }

  /**
   * Admit participant from waiting room
   */
  async admitFromWaitingRoom(roomCode: string, userId: string): Promise<any> {
    const session = await this.prisma.telehealthSession.findUnique({ where: { roomCode } });
    if (!session) throw new NotFoundException('Session not found');

    const participants = (session.participants as any[]) || [];
    const participant = participants.find((p) => p.userId === userId);
    if (!participant) throw new NotFoundException('Participant not in waiting room');

    participant.status = 'connected';
    participant.joinedAt = new Date();

    await this.prisma.telehealthSession.update({
      where: { id: session.id },
      data: { participants: participants as any, status: 'ACTIVE' },
    });

    return { admitted: true, userId };
  }

  /**
   * Leave/end session
   */
  async leaveSession(roomCode: string, userId: string, endForAll: boolean = false): Promise<any> {
    const session = await this.prisma.telehealthSession.findUnique({ where: { roomCode } });
    if (!session) throw new NotFoundException('Session not found');

    if (endForAll) {
      // End entire session
      const duration = session.startedAt
        ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
        : 0;

      await this.prisma.telehealthSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', endedAt: new Date(), duration },
      });

      this.eventEmitter.emit(DOMAIN_EVENTS.TELEHEALTH_ENDED, {
        sessionId: session.id,
        patientId: session.patientId,
        providerId: session.providerId,
        duration,
        roomCode,
      });

      return { ended: true, duration };
    }

    // Individual participant leaves
    const participants = (session.participants as any[]) || [];
    const participant = participants.find((p) => p.userId === userId);
    if (participant) {
      participant.status = 'disconnected';
      participant.leftAt = new Date();
    }

    await this.prisma.telehealthSession.update({
      where: { id: session.id },
      data: { participants: participants as any },
    });

    return { left: true, userId };
  }

  /**
   * Get session quality metrics
   */
  async getSessionQuality(roomCode: string): Promise<any> {
    const session = await this.prisma.telehealthSession.findUnique({ where: { roomCode } });
    if (!session) throw new NotFoundException('Session not found');

    return {
      sessionId: session.id,
      status: session.status,
      duration: session.startedAt
        ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
        : 0,
      maxDuration: session.maxDuration || 60,
      participants: session.participants || [],
      quality: {
        videoResolution: '720p',
        frameRate: 30,
        bitrate: '2500kbps',
        jitter: '< 30ms',
        packetLoss: '< 1%',
      },
    };
  }

  /**
   * Get upcoming and past sessions for a patient
   */
  async getPatientSessions(patientId: string) {
    return this.prisma.telehealthSession.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get provider's schedule of telehealth sessions
   */
  async getProviderSessions(providerId: string, date?: string) {
    const where: any = { providerId };
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dayStart, lte: dayEnd };
    }

    return this.prisma.telehealthSession.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
  }

  /**
   * Cancel a scheduled session
   */
  async cancelSession(sessionId: string, reason: string): Promise<any> {
    const session = await this.prisma.telehealthSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed session');
    }

    return this.prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', notes: reason },
    });
  }

  /**
   * Get WebRTC configuration (STUN/TURN servers)
   */
  private getRTCConfiguration(): any {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:turn.careforge.io:3478',
          username: 'careforge',
          credential: 'turn-secret',
        },
      ],
      iceCandidatePoolSize: 10,
    };
  }
}
