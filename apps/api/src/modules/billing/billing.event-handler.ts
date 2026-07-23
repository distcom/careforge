import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DOMAIN_EVENTS, EncounterCompletedEvent } from '../events/domain-events';

/**
 * Billing Event Handler
 * Auto-generates billing charges when encounters are completed
 */
@Injectable()
export class BillingEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DOMAIN_EVENTS.ENCOUNTER_COMPLETED)
  async handleEncounterCompleted(event: EncounterCompletedEvent) {
    // Auto-create E/M charge based on encounter type
    const emCodes: Record<string, { code: string; description: string; defaultFee: number }> = {
      OFFICE_VISIT: { code: '99213', description: 'Office visit, established patient, low complexity', defaultFee: 150 },
      FOLLOW_UP: { code: '99214', description: 'Office visit, established patient, moderate complexity', defaultFee: 200 },
      NEW_PATIENT: { code: '99203', description: 'Office visit, new patient, low complexity', defaultFee: 220 },
      TELEHEALTH: { code: '99213', description: 'Telehealth visit, established patient', defaultFee: 130 },
      URGENT_CARE: { code: '99214', description: 'Urgent care visit', defaultFee: 250 },
    };

    const emInfo = emCodes[event.type] || emCodes.OFFICE_VISIT;

    try {
      await this.prisma.charge.create({
        data: {
          patientId: event.patientId,
          encounterId: event.encounterId,
          providerId: event.providerId,
          cptCode: emInfo.code,
          description: emInfo.description,
          units: 1,
          fee: emInfo.defaultFee,
          serviceDate: new Date(),
          status: 'PENDING',
        },
      });

      // Create charges for any procedures documented
      for (const procedureCode of event.procedures) {
        const feeItem = await this.prisma.feeScheduleItem.findFirst({
          where: { code: procedureCode, feeSchedule: { isActive: true } },
        });

        await this.prisma.charge.create({
          data: {
            patientId: event.patientId,
            encounterId: event.encounterId,
            providerId: event.providerId,
            cptCode: procedureCode,
            description: `Procedure: ${procedureCode}`,
            units: 1,
            fee: feeItem ? Number(feeItem.amount) : 0,
            serviceDate: new Date(),
            status: 'PENDING',
          },
        });
      }
    } catch (error) {
      console.error(`Failed to auto-create charges for encounter ${event.encounterId}:`, error);
    }
  }
}
