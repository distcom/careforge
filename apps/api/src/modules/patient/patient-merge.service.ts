import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/domain-events';

export interface DuplicateMatch {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  score: number;
  matchReasons: string[];
}

/**
 * Patient Merge & Deduplication Service
 * Detects potential duplicates and safely merges patient records
 */
@Injectable()
export class PatientMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find potential duplicate patients using fuzzy matching
   */
  async findDuplicates(patientId?: string): Promise<DuplicateMatch[]> {
    const where: any = { deletedAt: null };
    if (patientId) where.id = { not: patientId };

    const patients = await this.prisma.patient.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        ssn: true,
        phone: true,
        email: true,
        address: true,
        zipCode: true,
        medicalRecordNumber: true,
      },
      take: 1000,
    });

    const target = patientId
      ? await this.prisma.patient.findUnique({ where: { id: patientId } })
      : null;

    if (!target && !patientId) {
      // Find all potential duplicates across the entire patient list
      return this.findAllPairwiseDuplicates(patients);
    }

    if (!target) return [];

    // Score each patient against the target
    const matches: DuplicateMatch[] = [];
    for (const p of patients) {
      if (p.id === patientId) continue;
      const { score, reasons } = this.calculateMatchScore(target, p);
      if (score >= 60) {
        matches.push({
          patientId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          score,
          matchReasons: reasons,
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Merge source patient into target patient
   * All clinical records are transferred, source is marked as merged
   */
  async mergePatients(targetId: string, sourceId: string, mergedBy: string): Promise<any> {
    if (targetId === sourceId) {
      throw new BadRequestException('Cannot merge a patient with itself');
    }

    const [target, source] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: targetId } }),
      this.prisma.patient.findUnique({ where: { id: sourceId } }),
    ]);

    if (!target || !source) {
      throw new BadRequestException('One or both patients not found');
    }

    // Transfer all clinical records from source to target
    await this.prisma.$transaction(async (tx) => {
      // Transfer encounters
      await tx.encounter.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer vitals
      await tx.vitalSign.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer conditions
      await tx.condition.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer medications
      await tx.medication.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer allergies
      await tx.allergy.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer immunizations
      await tx.immunization.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer lab orders
      await tx.labOrder.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer documents
      await tx.clinicalDocument.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer appointments
      await tx.appointment.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer charges
      await tx.charge.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer claims
      await tx.claim.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer payments
      await tx.payment.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer care plans
      await tx.carePlan.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Transfer referrals
      await tx.referral.updateMany({
        where: { patientId: sourceId },
        data: { patientId: targetId },
      });

      // Fill in missing demographics on target
      const updates: any = {};
      if (!target.phone && source.phone) updates.phone = source.phone;
      if (!target.email && source.email) updates.email = source.email;
      if (!target.address && source.address) updates.address = source.address;
      if (!target.ssn && source.ssn) updates.ssn = source.ssn;

      if (Object.keys(updates).length > 0) {
        await tx.patient.update({ where: { id: targetId }, data: updates });
      }

      // Mark source as merged (soft delete with merge reference)
      await tx.patient.update({
        where: { id: sourceId },
        data: {
          status: 'MERGED',
          deletedAt: new Date(),
        },
      });

      // Log the merge in audit trail
      await tx.auditLog.create({
        data: {
          userId: mergedBy,
          action: 'MERGE',
          entityType: 'Patient',
          entityId: targetId,
          details: {
            sourcePatientId: sourceId,
            sourceName: `${source.firstName} ${source.lastName}`,
            targetName: `${target.firstName} ${target.lastName}`,
          },
          ipAddress: '127.0.0.1',
          userAgent: 'CareForge-System',
        },
      });
    });

    // Emit merge event
    this.eventEmitter.emit(DOMAIN_EVENTS.PATIENT_MERGED, {
      targetPatientId: targetId,
      sourcePatientId: sourceId,
      mergedBy,
    });

    return {
      success: true,
      targetPatientId: targetId,
      mergedPatientId: sourceId,
      message: `Patient "${source.firstName} ${source.lastName}" merged into "${target.firstName} ${target.lastName}"`,
    };
  }

  private calculateMatchScore(
    a: any,
    b: any,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Exact SSN match (very high confidence)
    if (a.ssn && b.ssn && a.ssn === b.ssn) {
      score += 50;
      reasons.push('SSN match');
    }

    // Name matching (case-insensitive)
    if (a.firstName?.toLowerCase() === b.firstName?.toLowerCase()) {
      score += 15;
      reasons.push('First name match');
    }
    if (a.lastName?.toLowerCase() === b.lastName?.toLowerCase()) {
      score += 15;
      reasons.push('Last name match');
    }

    // DOB match
    if (a.dateOfBirth && b.dateOfBirth && a.dateOfBirth === b.dateOfBirth) {
      score += 20;
      reasons.push('Date of birth match');
    }

    // Gender match
    if (a.gender && b.gender && a.gender === b.gender) {
      score += 5;
      reasons.push('Gender match');
    }

    // Phone match
    if (a.phone && b.phone && this.normalizePhone(a.phone) === this.normalizePhone(b.phone)) {
      score += 15;
      reasons.push('Phone number match');
    }

    // Email match
    if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
      score += 15;
      reasons.push('Email match');
    }

    // Address similarity
    if (a.zipCode && b.zipCode && a.zipCode === b.zipCode) {
      score += 5;
      reasons.push('ZIP code match');
    }

    return { score: Math.min(score, 100), reasons };
  }

  private findAllPairwiseDuplicates(patients: any[]): DuplicateMatch[] {
    const duplicates: DuplicateMatch[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < patients.length; i++) {
      for (let j = i + 1; j < patients.length; j++) {
        const { score, reasons } = this.calculateMatchScore(patients[i], patients[j]);
        if (score >= 70) {
          const key = `${patients[i].id}-${patients[j].id}`;
          if (!seen.has(key)) {
            seen.add(key);
            duplicates.push({
              patientId: patients[j].id,
              firstName: patients[j].firstName,
              lastName: patients[j].lastName,
              dateOfBirth: patients[j].dateOfBirth,
              score,
              matchReasons: [`Potential duplicate of ${patients[i].firstName} ${patients[i].lastName}`, ...reasons],
            });
          }
        }
      }
    }

    return duplicates.sort((a, b) => b.score - a.score).slice(0, 50);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
