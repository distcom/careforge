import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/domain-events';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  roles?: string[];
}

/**
 * CareForge Real-Time Gateway
 * Handles WebSocket connections for:
 * - Real-time notifications
 * - Live appointment status updates
 * - Messaging (instant message delivery)
 * - Telehealth waiting room
 * - Lab result alerts
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Set<string>>(); // userId -> socketIds

  handleConnection(client: AuthenticatedSocket) {
    // Extract user from handshake auth (JWT token)
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    // In production: verify JWT and extract userId/roles
    // For now, accept the userId from auth payload
    const userId = client.handshake.auth?.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    client.userId = userId;
    client.join(`user:${userId}`);

    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(client.id);

    console.log(`[WS] User ${userId} connected (${client.id})`);
    client.emit('connected', { userId, timestamp: new Date().toISOString() });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId && this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId)!.delete(client.id);
      if (this.connectedUsers.get(userId)!.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    console.log(`[WS] Client ${client.id} disconnected`);
  }

  // --- Room Management ---

  @SubscribeMessage('join:encounter')
  handleJoinEncounter(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { encounterId: string }) {
    client.join(`encounter:${data.encounterId}`);
    return { event: 'joined:encounter', data: { encounterId: data.encounterId } };
  }

  @SubscribeMessage('leave:encounter')
  handleLeaveEncounter(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { encounterId: string }) {
    client.leave(`encounter:${data.encounterId}`);
    return { event: 'left:encounter', data: { encounterId: data.encounterId } };
  }

  @SubscribeMessage('join:telehealth')
  handleJoinTelehealth(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { sessionId: string }) {
    client.join(`telehealth:${data.sessionId}`);
    // Notify others in the room
    client.to(`telehealth:${data.sessionId}`).emit('telehealth:participant_joined', {
      userId: client.userId,
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
    });
    return { event: 'joined:telehealth', data: { sessionId: data.sessionId } };
  }

  @SubscribeMessage('leave:telehealth')
  handleLeaveTelehealth(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { sessionId: string }) {
    client.leave(`telehealth:${data.sessionId}`);
    client.to(`telehealth:${data.sessionId}`).emit('telehealth:participant_left', {
      userId: client.userId,
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
    });
    return { event: 'left:telehealth', data: { sessionId: data.sessionId } };
  }

  // --- WebRTC Signaling ---

  @SubscribeMessage('telehealth:signal')
  handleTelehealthSignal(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { sessionId: string; signal: any; to: string }) {
    // Relay WebRTC signaling data to target peer
    this.server.to(`user:${data.to}`).emit('telehealth:signal', {
      from: client.userId,
      signal: data.signal,
      sessionId: data.sessionId,
    });
    return { event: 'signal:sent' };
  }

  // --- Messaging ---

  @SubscribeMessage('message:typing')
  handleTyping(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { threadId: string }) {
    client.to(`user:${data.threadId}`).emit('message:typing', {
      userId: client.userId,
      threadId: data.threadId,
    });
  }

  // --- Presence ---

  @SubscribeMessage('presence:update')
  handlePresenceUpdate(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { status: string }) {
    this.server.emit('presence:update', {
      userId: client.userId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  }

  // --- Domain Event Listeners (push to connected clients) ---

  @OnEvent(DOMAIN_EVENTS.NOTIFICATION_CREATED)
  pushNotification(event: any) {
    if (event.userId) {
      this.server.to(`user:${event.userId}`).emit('notification:new', {
        id: event.notificationId,
        type: event.type,
        title: event.title,
        message: event.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @OnEvent(DOMAIN_EVENTS.LAB_RESULT_CRITICAL)
  pushCriticalLabResult(event: any) {
    // Push to provider's connected sessions
    this.server.to(`user:${event.providerId}`).emit('lab:critical_result', {
      labOrderId: event.labOrderId,
      patientId: event.patientId,
      testName: event.testName,
      resultValue: event.resultValue,
      flag: event.flag,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent(DOMAIN_EVENTS.MESSAGE_SENT)
  pushMessage(event: any) {
    for (const recipientId of event.recipientIds) {
      this.server.to(`user:${recipientId}`).emit('message:new', {
        threadId: event.threadId,
        messageId: event.messageId,
        senderId: event.senderId,
        subject: event.subject,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @OnEvent(DOMAIN_EVENTS.APPOINTMENT_SCHEDULED)
  pushAppointmentUpdate(event: any) {
    this.server.to(`user:${event.providerId}`).emit('appointment:new', {
      appointmentId: event.appointmentId,
      patientId: event.patientId,
      startTime: event.startTime,
      type: event.type,
    });
  }

  // --- Utility ---

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }
}
