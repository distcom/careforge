import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  DOMAIN_EVENTS,
  EncounterCompletedEvent,
  AppointmentScheduledEvent,
  LabResultCriticalEvent,
  MessageSentEvent,
  MedicationPrescribedEvent,
  ClaimSubmittedEvent,
} from '../events/domain-events';

/**
 * Notification Event Handler
 * Listens to domain events and creates in-app + queued notifications
 */
@Injectable()
export class NotificationEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DOMAIN_EVENTS.ENCOUNTER_COMPLETED)
  async handleEncounterCompleted(event: EncounterCompletedEvent) {
    // Notify billing that encounter is ready for charge entry
    await this.createNotification(
      event.providerId,
      'ENCOUNTER_COMPLETED',
      `Encounter completed. Ready for charge entry.`,
      { encounterId: event.encounterId, patientId: event.patientId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.APPOINTMENT_SCHEDULED)
  async handleAppointmentScheduled(event: AppointmentScheduledEvent) {
    // Notify provider of new appointment
    await this.createNotification(
      event.providerId,
      'APPOINTMENT_SCHEDULED',
      `New appointment scheduled for ${event.startTime.toLocaleDateString()}.`,
      { appointmentId: event.appointmentId, patientId: event.patientId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.LAB_RESULT_CRITICAL)
  async handleCriticalLabResult(event: LabResultCriticalEvent) {
    // Urgently notify ordering provider of critical result
    await this.createNotification(
      event.providerId,
      'CRITICAL_LAB_RESULT',
      `CRITICAL: ${event.testName} = ${event.resultValue} (${event.referenceRange}) [${event.flag}]`,
      { labOrderId: event.labOrderId, patientId: event.patientId, priority: 'URGENT' },
    );
  }

  @OnEvent(DOMAIN_EVENTS.MESSAGE_SENT)
  async handleMessageSent(event: MessageSentEvent) {
    // Notify all recipients
    for (const recipientId of event.recipientIds) {
      if (recipientId !== event.senderId) {
        await this.createNotification(
          recipientId,
          'NEW_MESSAGE',
          `New message: ${event.subject}`,
          { threadId: event.threadId, messageId: event.messageId },
        );
      }
    }
  }

  @OnEvent(DOMAIN_EVENTS.MEDICATION_PRESCRIBED)
  async handleMedicationPrescribed(event: MedicationPrescribedEvent) {
    // Notify patient via portal
    await this.createNotification(
      event.patientId,
      'PRESCRIPTION_ADDED',
      `New prescription: ${event.drugName} ${event.dosage || ''}`,
      { medicationId: event.medicationId },
    );
  }

  @OnEvent(DOMAIN_EVENTS.CLAIM_SUBMITTED)
  async handleClaimSubmitted(event: ClaimSubmittedEvent) {
    // Notify billing staff
    await this.createNotification(
      event.patientId,
      'CLAIM_SUBMITTED',
      `Claim ${event.claimNumber} submitted to ${event.payerName} for $${event.totalAmount.toFixed(2)}.`,
      { claimId: event.claimId },
    );
  }

  private async createNotification(
    userId: string,
    type: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type,
          title: type.replace(/_/g, ' '),
          message,
          metadata: metadata || {},
          isRead: false,
        },
      });
    } catch (error) {
      // Log but don't throw - notification failure shouldn't break the main flow
      console.error(`Failed to create notification for ${userId}:`, error);
    }
  }
}
