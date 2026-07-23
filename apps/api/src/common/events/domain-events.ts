/**
 * CareForge Domain Events
 * Central registry of all domain events for cross-module communication
 */
export const DOMAIN_EVENTS = {
  // Patient events
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_DEACTIVATED: 'patient.deactivated',
  PATIENT_MERGED: 'patient.merged',

  // Encounter events
  ENCOUNTER_STARTED: 'encounter.started',
  ENCOUNTER_COMPLETED: 'encounter.completed',
  ENCOUNTER_SIGNED: 'encounter.signed',

  // Scheduling events
  APPOINTMENT_SCHEDULED: 'appointment.scheduled',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_NO_SHOW: 'appointment.no_show',

  // Clinical events
  VITALS_RECORDED: 'vitals.recorded',
  CONDITION_DIAGNOSED: 'condition.diagnosed',
  CONDITION_RESOLVED: 'condition.resolved',
  ALLERGY_RECORDED: 'allergy.recorded',

  // Medication events
  MEDICATION_PRESCRIBED: 'medication.prescribed',
  MEDICATION_DISCONTINUED: 'medication.discontinued',
  PRESCRIPTION_SENT: 'medication.prescription_sent',
  PRESCRIPTION_REFILL: 'medication.prescription_refill',
  IMMUNIZATION_ADMINISTERED: 'immunization.administered',

  // Lab events
  LAB_ORDER_CREATED: 'lab.order_created',
  LAB_ORDERED: 'lab.ordered',
  LAB_ORDER_COLLECTED: 'lab.order_collected',
  LAB_RESULT_ENTERED: 'lab.result_entered',
  LAB_RESULT_RECEIVED: 'lab.result_received',
  LAB_RESULT_CRITICAL: 'lab.result_critical',
  LAB_ORDER_REVIEWED: 'lab.order_reviewed',

  // Billing events
  CHARGE_CREATED: 'billing.charge_created',
  CLAIM_SUBMITTED: 'billing.claim_submitted',
  CLAIM_REJECTED: 'billing.claim_rejected',
  PAYMENT_POSTED: 'billing.payment_posted',
  STATEMENT_GENERATED: 'billing.statement_generated',

  // Document events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_SIGNED: 'document.signed',

  // Messaging events
  MESSAGE_SENT: 'messaging.message_sent',
  MESSAGE_READ: 'messaging.message_read',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_READ: 'notification.read',

  // Portal events
  PORTAL_REGISTRATION: 'portal.registration',
  PORTAL_APPOINTMENT_REQUESTED: 'portal.appointment_requested',

  // Telehealth events
  TELEHEALTH_SCHEDULED: 'telehealth.scheduled',
  TELEHEALTH_SESSION_STARTED: 'telehealth.session_started',
  TELEHEALTH_SESSION_ENDED: 'telehealth.session_ended',
  TELEHEALTH_PARTICIPANT_JOINED: 'telehealth.participant_joined',
  TELEHEALTH_ENDED: 'telehealth.ended',

  // Audit events
  AUDIT_LOG_CREATED: 'audit.log_created',
  AUDIT_BREAK_GLASS: 'audit.break_glass',
} as const;

export type DomainEvent = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

// Event payload interfaces
export interface PatientCreatedEvent {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  createdBy: string;
}

export interface EncounterCompletedEvent {
  encounterId: string;
  patientId: string;
  providerId: string;
  type: string;
  diagnoses: string[];
  procedures: string[];
}

export interface AppointmentScheduledEvent {
  appointmentId: string;
  patientId: string;
  providerId: string;
  startTime: Date;
  endTime: Date;
  type: string;
  reason?: string;
}

export interface LabResultCriticalEvent {
  labOrderId: string;
  patientId: string;
  providerId: string;
  testName: string;
  resultValue: number;
  referenceRange: string;
  flag: string;
}

export interface MedicationPrescribedEvent {
  medicationId: string;
  patientId: string;
  providerId: string;
  drugName: string;
  rxnormCode?: string;
  dosage?: string;
}

export interface ClaimSubmittedEvent {
  claimId: string;
  claimNumber: string;
  patientId: string;
  payerName: string;
  totalAmount: number;
}

export interface MessageSentEvent {
  threadId: string;
  messageId: string;
  senderId: string;
  recipientIds: string[];
  subject: string;
}
