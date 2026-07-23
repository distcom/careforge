import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Patient Access Levels:
 * - FULL: Can view and modify all patient data
 * - READ: Can view patient data only
 * - NONE: No access
 *
 * Access is determined by:
 * 1. Facility assignment (user must be assigned to patient's facility)
 * 2. Provider assignment (user is patient's primary provider)
 * 3. Encounter assignment (user has an encounter with patient)
 * 4. Explicit permission (admin role or patient:read-all permission)
 * 5. Break-glass (emergency access with audit)
 */

export const PATIENT_ACCESS_KEY = 'patient_access';

export interface PatientAccessOptions {
  requireWrite?: boolean;
  allowBreakGlass?: boolean;
}

@Injectable()
export class PatientAccessGuard implements CanActivate {
  private readonly logger = new Logger(PatientAccessGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get patient ID from route params or body
    const patientId = request.params.id || request.body?.patientId;
    if (!patientId) {
      // No patient context - allow (other guards handle this)
      return true;
    }

    // Check for admin or global patient access permission
    if (user.roles?.includes('admin') || user.permissions?.includes('patient:read-all')) {
      return true;
    }

    // Check for break-glass access
    const isBreakGlass = request.headers['x-break-glass'] === 'true';
    const breakGlassJustification = request.headers['x-break-glass-reason'];

    if (isBreakGlass) {
      if (!breakGlassJustification) {
        throw new ForbiddenException('Break-glass access requires justification');
      }

      // Log break-glass access
      await this.auditService.log({
        action: 'BREAK_GLASS_PATIENT_ACCESS',
        entityType: 'Patient',
        entityId: patientId,
        userId: user.id,
        details: {
          justification: breakGlassJustification,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
        isBreakGlass: true,
      });

      this.logger.warn(`Break-glass access to patient ${patientId} by user ${user.id}: ${breakGlassJustification}`);
      return true;
    }

    // Check patient access
    const hasAccess = await this.checkPatientAccess(user, patientId);

    if (!hasAccess) {
      // Log denied access
      await this.auditService.log({
        action: 'PATIENT_ACCESS_DENIED',
        entityType: 'Patient',
        entityId: patientId,
        userId: user.id,
        details: {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });

      throw new ForbiddenException('Access to this patient record is not authorized');
    }

    return true;
  }

  private async checkPatientAccess(user: any, patientId: string): Promise<boolean> {
    // Get patient with facility info
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      select: {
        id: true,
        facilityId: true,
        primaryProviderId: true,
        userId: true,
      },
    });

    if (!patient) {
      return false;
    }

    // 1. Patient accessing own record
    if (patient.userId === user.id) {
      return true;
    }

    // 2. Primary provider
    if (patient.primaryProviderId === user.id) {
      return true;
    }

    // 3. Check facility assignment
    if (patient.facilityId) {
      const userFacility = await this.prisma.userFacility.findFirst({
        where: {
          userId: user.id,
          facilityId: patient.facilityId,
        },
      });

      if (userFacility) {
        return true;
      }
    }

    // 4. Check if user has encounter with patient (care team member)
    const encounter = await this.prisma.encounter.findFirst({
      where: {
        patientId,
        providerId: user.id,
        deletedAt: null,
      },
    });

    if (encounter) {
      return true;
    }

    // 5. Check if user has appointment with patient
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        providerId: user.id,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });

    if (appointment) {
      return true;
    }

    // 6. Check for explicit patient access grant (for care coordination)
    // This would require a PatientAccessGrant model - not yet implemented
    // For now, deny access

    return false;
  }
}
