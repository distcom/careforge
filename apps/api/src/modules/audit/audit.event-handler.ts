import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DOMAIN_EVENTS } from '../events/domain-events';

/**
 * Audit Event Handler
 * Automatically logs all significant domain events to the audit trail (HIPAA compliance)
 */
@Injectable()
export class AuditEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DOMAIN_EVENTS.PATIENT_CREATED)
  async logPatientCreated(event: any) {
    await this.log(event.createdBy, 'CREATE', 'Patient', event.patientId, {
      name: `${event.firstName} ${event.lastName}`,
    });
  }

  @OnEvent(DOMAIN_EVENTS.ENCOUNTER_COMPLETED)
  async logEncounterCompleted(event: any) {
    await this.log(event.providerId, 'UPDATE', 'Encounter', event.encounterId, {
      status: 'COMPLETED',
      patientId: event.patientId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.MEDICATION_PRESCRIBED)
  async logMedicationPrescribed(event: any) {
    await this.log(event.providerId, 'CREATE', 'Medication', event.medicationId, {
      drugName: event.drugName,
      patientId: event.patientId,
    });
  }

  @OnEvent(DOMAIN_EVENTS.LAB_RESULT_CRITICAL)
  async logCriticalLabResult(event: any) {
    await this.log(event.providerId, 'UPDATE', 'LabOrder', event.labOrderId, {
      critical: true,
      testName: event.testName,
      resultValue: event.resultValue,
    });
  }

  @OnEvent(DOMAIN_EVENTS.CLAIM_SUBMITTED)
  async logClaimSubmitted(event: any) {
    await this.log('system', 'UPDATE', 'Claim', event.claimId, {
      claimNumber: event.claimNumber,
      status: 'SUBMITTED',
      amount: event.totalAmount,
    });
  }

  @OnEvent(DOMAIN_EVENTS.DOCUMENT_UPLOADED)
  async logDocumentUploaded(event: any) {
    await this.log(event.uploadedBy, 'CREATE', 'Document', event.documentId, {
      fileName: event.fileName,
      category: event.category,
    });
  }

  @OnEvent(DOMAIN_EVENTS.AUDIT_BREAK_GLASS)
  async logBreakGlass(event: any) {
    await this.log(event.userId, 'ACCESS', 'Patient', event.patientId, {
      reason: event.reason,
      breakGlass: true,
      timestamp: new Date().toISOString(),
    });
  }

  private async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details: details || {},
          ipAddress: '127.0.0.1', // In production, extract from request context
          userAgent: 'CareForge-System',
        },
      });
    } catch (error) {
      // Audit logging must never break the main flow
      console.error(`Audit log failed for ${entityType}/${entityId}:`, error);
    }
  }
}
