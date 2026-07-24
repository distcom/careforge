import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { MailModule } from './infrastructure/mail/mail.module';
import { QueueInfrastructureModule } from './infrastructure/queue/queue-infrastructure.module';
import { RealtimeModule } from './infrastructure/realtime/realtime.module';
import { BackupModule } from './infrastructure/backup/backup.module';
import { GlobalJwtAuthGuard } from './common/guards/global-jwt-auth.guard';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PatientModule } from './modules/patient/patient.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EncounterModule } from './modules/encounter/encounter.module';
import { VitalsModule } from './modules/vitals/vitals.module';
import { ConditionModule } from './modules/condition/condition.module';
import { MedicationModule } from './modules/medication/medication.module';
import { AllergyModule } from './modules/allergy/allergy.module';
import { ImmunizationModule } from './modules/immunization/immunization.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { ProcedureModule } from './modules/procedure/procedure.module';
import { DocumentModule } from './modules/document/document.module';
import { CarePlanModule } from './modules/care-plan/care-plan.module';
import { ReferralModule } from './modules/referral/referral.module';
import { BillingModule } from './modules/billing/billing.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PortalModule } from './modules/portal/portal.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TerminologyModule } from './modules/terminology/terminology.module';
import { FacilityModule } from './modules/facility/facility.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { TelehealthModule } from './modules/telehealth/telehealth.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { ConsentModule } from './modules/consent/consent.module';
import { ClinicalDecisionSupportModule } from './modules/clinical-decision-support/clinical-decision-support.module';
import { QualityReportingModule } from './modules/quality-reporting/quality-reporting.module';
import { DataMigrationModule } from './modules/data-migration/data-migration.module';
import { Hl7v2Module } from './modules/hl7v2/hl7v2.module';

@Module({
  imports: [
    // Core configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // SECURITY: Rate limiting (100 requests per 60 seconds per IP)
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Infrastructure
    PrismaModule,
    RedisModule,
    StorageModule,
    MailModule,
    QueueInfrastructureModule,
    RealtimeModule,
    BackupModule,

    // Domain modules
    HealthModule,
    IdentityModule,
    PatientModule,
    SchedulingModule,
    EncounterModule,
    VitalsModule,
    ConditionModule,
    MedicationModule,
    AllergyModule,
    ImmunizationModule,
    LaboratoryModule,
    ProcedureModule,
    DocumentModule,
    CarePlanModule,
    ReferralModule,
    BillingModule,
    InsuranceModule,
    ReportingModule,
    MessagingModule,
    PortalModule,
    NotificationModule,
    TerminologyModule,
    FacilityModule,
    AuditModule,
    AdminModule,
    TelehealthModule,
    FhirModule,
    ConsentModule,
    ClinicalDecisionSupportModule,
    QualityReportingModule,
    DataMigrationModule,
    Hl7v2Module,
  ],
  providers: [
    // SECURITY: Deny-by-default — all routes require JWT unless @Public()
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
    // SECURITY: Global rate limiting
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
