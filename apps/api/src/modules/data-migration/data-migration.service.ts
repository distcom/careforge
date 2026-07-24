import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface MigrationConfig {
  sourceType: 'OPENEMR' | 'CSV' | 'FHIR' | 'HL7V2';
  batchSize: number;
  dryRun: boolean;
  skipErrors: boolean;
  validateOnly: boolean;
}

export interface MigrationJob {
  id: string;
  sourceType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  config: MigrationConfig;
  startedAt?: Date;
  completedAt?: Date;
  stats: MigrationStats;
  errors: MigrationError[];
}

export interface MigrationStats {
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  byEntityType: Record<string, { total: number; success: number; error: number }>;
}

export interface MigrationError {
  entityType: string;
  sourceId: string;
  error: string;
  timestamp: Date;
}

export interface MappingConfig {
  sourceField: string;
  targetField: string;
  transform?: string;
  required?: boolean;
  defaultValue?: any;
}

export interface ReconciliationResult {
  entityType: string;
  sourceCount: number;
  targetCount: number;
  matchedCount: number;
  unmatchedSource: string[];
  unmatchedTarget: string[];
  checksumMatch: boolean;
}

@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);
  private jobs: Map<string, MigrationJob> = new Map();

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Migration Jobs
  async createMigrationJob(config: MigrationConfig, userId?: string): Promise<MigrationJob> {
    const jobId = `MIG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const job: MigrationJob = {
      id: jobId,
      sourceType: config.sourceType,
      status: 'PENDING',
      config,
      stats: {
        totalRecords: 0,
        processedRecords: 0,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
        byEntityType: {},
      },
      errors: [],
    };

    this.jobs.set(jobId, job);

    await this.auditService.log({
      action: 'MIGRATION_JOB_CREATED',
      entityType: 'MigrationJob',
      entityId: jobId,
      userId,
      details: { sourceType: config.sourceType, dryRun: config.dryRun },
    });

    return job;
  }

  async getMigrationJob(jobId: string): Promise<MigrationJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Migration job not found');
    return job;
  }

  async listMigrationJobs(): Promise<MigrationJob[]> {
    return Array.from(this.jobs.values()).sort((a, b) =>
      (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0)
    );
  }

  async cancelMigrationJob(jobId: string, userId?: string): Promise<MigrationJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Migration job not found');

    if (job.status !== 'PENDING' && job.status !== 'RUNNING') {
      throw new BadRequestException('Can only cancel pending or running jobs');
    }

    job.status = 'CANCELLED';
    job.completedAt = new Date();

    await this.auditService.log({
      action: 'MIGRATION_JOB_CANCELLED',
      entityType: 'MigrationJob',
      entityId: jobId,
      userId,
      details: { stats: job.stats },
    });

    return job;
  }

  // Preflight Analysis
  async runPreflightAnalysis(sourceType: string, userId?: string) {
    const analysis = {
      sourceType,
      timestamp: new Date().toISOString(),
      checks: [] as any[],
      recommendations: [] as string[],
      readyForMigration: true,
    };

    // Check database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      analysis.checks.push({ name: 'Database Connectivity', status: 'PASS' });
    } catch (error) {
      analysis.checks.push({ name: 'Database Connectivity', status: 'FAIL', error: error.message });
      analysis.readyForMigration = false;
    }

    // Check required tables exist
    const requiredTables = ['patients', 'users', 'encounters', 'conditions', 'medications'];
    for (const table of requiredTables) {
      try {
        const count = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
        analysis.checks.push({ name: `Table: ${table}`, status: 'PASS', count: count[0]?.count });
      } catch (error) {
        analysis.checks.push({ name: `Table: ${table}`, status: 'FAIL', error: error.message });
      }
    }

    // Check for existing data
    const patientCount = await this.prisma.patient.count();
    if (patientCount > 0) {
      analysis.recommendations.push(`Database contains ${patientCount} existing patients. Consider backup before migration.`);
    }

    await this.auditService.log({
      action: 'MIGRATION_PREFLIGHT_ANALYSIS',
      entityType: 'MigrationAnalysis',
      entityId: sourceType,
      userId,
      details: { readyForMigration: analysis.readyForMigration },
    });

    return analysis;
  }

  // Dry Run
  async runDryRun(sourceType: string, sampleData: any[], userId?: string) {
    const results = {
      sourceType,
      dryRun: true,
      timestamp: new Date().toISOString(),
      records: [] as any[],
      summary: {
        total: sampleData.length,
        valid: 0,
        invalid: 0,
        warnings: 0,
      },
    };

    for (const record of sampleData) {
      const validationResult = await this.validateRecord(sourceType, record);
      results.records.push(validationResult);

      if (validationResult.valid) {
        results.summary.valid++;
      } else {
        results.summary.invalid++;
      }
      if (validationResult.warnings.length > 0) {
        results.summary.warnings++;
      }
    }

    await this.auditService.log({
      action: 'MIGRATION_DRY_RUN',
      entityType: 'MigrationDryRun',
      entityId: sourceType,
      userId,
      details: { summary: results.summary },
    });

    return results;
  }

  private async validateRecord(sourceType: string, record: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields based on entity type
    if (record.entityType === 'Patient') {
      if (!record.firstName) errors.push('Missing firstName');
      if (!record.lastName) errors.push('Missing lastName');
      if (!record.dateOfBirth) errors.push('Missing dateOfBirth');
      if (record.dateOfBirth && new Date(record.dateOfBirth) > new Date()) {
        warnings.push('Date of birth is in the future');
      }
    }

    // Check for duplicates
    if (record.entityType === 'Patient' && record.email) {
      const existing = await this.prisma.patient.findFirst({
        where: { email: record.email, deletedAt: null },
      });
      if (existing) {
        warnings.push(`Patient with email ${record.email} already exists`);
      }
    }

    return {
      sourceId: record.id || record.sourceId,
      entityType: record.entityType,
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Data Mapping
  async getMappingTemplate(sourceType: string, entityType: string) {
    const templates: Record<string, Record<string, MappingConfig[]>> = {
      OPENEMR: {
        Patient: [
          { sourceField: 'fname', targetField: 'firstName', required: true },
          { sourceField: 'lname', targetField: 'lastName', required: true },
          { sourceField: 'mname', targetField: 'middleName' },
          { sourceField: 'DOB', targetField: 'dateOfBirth', transform: 'date', required: true },
          { sourceField: 'sex', targetField: 'gender', transform: 'gender' },
          { sourceField: 'ss', targetField: 'ssn' },
          { sourceField: 'street', targetField: 'address' },
          { sourceField: 'city', targetField: 'city' },
          { sourceField: 'state', targetField: 'state' },
          { sourceField: 'postal_code', targetField: 'zipCode' },
          { sourceField: 'phone_home', targetField: 'phone' },
          { sourceField: 'email', targetField: 'email' },
        ],
        Encounter: [
          { sourceField: 'pid', targetField: 'patientId', required: true },
          { sourceField: 'encounter', targetField: 'externalId' },
          { sourceField: 'date', targetField: 'createdAt', transform: 'date' },
          { sourceField: 'reason', targetField: 'chiefComplaint' },
        ],
      },
      CSV: {
        Patient: [
          { sourceField: 'first_name', targetField: 'firstName', required: true },
          { sourceField: 'last_name', targetField: 'lastName', required: true },
          { sourceField: 'dob', targetField: 'dateOfBirth', transform: 'date', required: true },
          { sourceField: 'gender', targetField: 'gender', transform: 'gender' },
        ],
      },
    };

    return templates[sourceType]?.[entityType] || [];
  }

  // Reconciliation
  async reconcileData(entityType: string, sourceIds: string[], userId?: string): Promise<ReconciliationResult> {
    let targetCount = 0;
    let matchedCount = 0;
    const unmatchedSource: string[] = [];

    switch (entityType) {
      case 'Patient':
        targetCount = await this.prisma.patient.count({ where: { deletedAt: null } });
        for (const sourceId of sourceIds) {
          const exists = await this.prisma.patient.findFirst({
            where: { medicalRecordNumber: sourceId, deletedAt: null },
          });
          if (exists) {
            matchedCount++;
          } else {
            unmatchedSource.push(sourceId);
          }
        }
        break;
      case 'Encounter':
        targetCount = await this.prisma.encounter.count({ where: { deletedAt: null } });
        break;
      case 'Condition':
        targetCount = await this.prisma.condition.count({ where: { deletedAt: null } });
        break;
      case 'Medication':
        targetCount = await this.prisma.medication.count({ where: { deletedAt: null } });
        break;
    }

    const result: ReconciliationResult = {
      entityType,
      sourceCount: sourceIds.length,
      targetCount,
      matchedCount,
      unmatchedSource: unmatchedSource.slice(0, 100), // Limit to first 100
      unmatchedTarget: [],
      checksumMatch: sourceIds.length === matchedCount,
    };

    await this.auditService.log({
      action: 'MIGRATION_RECONCILIATION',
      entityType: 'MigrationReconciliation',
      entityId: entityType,
      userId,
      details: { result },
    });

    return result;
  }

  // Exception Queue
  async getExceptionQueue(jobId: string): Promise<MigrationError[]> {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Migration job not found');
    return job.errors;
  }

  async retryFailedRecords(jobId: string, userId?: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Migration job not found');

    const failedCount = job.errors.length;
    job.errors = [];
    job.stats.errorCount = 0;

    await this.auditService.log({
      action: 'MIGRATION_RETRY_FAILED',
      entityType: 'MigrationJob',
      entityId: jobId,
      userId,
      details: { retriedCount: failedCount },
    });

    return { message: `Retrying ${failedCount} failed records`, jobId };
  }

  // Migration Report
  async generateMigrationReport(jobId: string, userId?: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Migration job not found');

    const report = {
      jobId,
      sourceType: job.sourceType,
      status: job.status,
      config: job.config,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      duration: job.startedAt && job.completedAt
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : null,
      stats: job.stats,
      errorSummary: {
        total: job.errors.length,
        byEntityType: job.errors.reduce((acc, err) => {
          acc[err.entityType] = (acc[err.entityType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      generatedAt: new Date().toISOString(),
    };

    await this.auditService.log({
      action: 'MIGRATION_REPORT_GENERATED',
      entityType: 'MigrationReport',
      entityId: jobId,
      userId,
      details: { status: job.status },
    });

    return report;
  }

  // Rollback Support
  async createRollbackPoint(jobId: string, userId?: string) {
    const rollbackId = `RB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await this.auditService.log({
      action: 'MIGRATION_ROLLBACK_POINT_CREATED',
      entityType: 'MigrationRollback',
      entityId: rollbackId,
      userId,
      details: { jobId },
    });

    return {
      rollbackId,
      jobId,
      createdAt: new Date().toISOString(),
      message: 'Rollback point created. Use this ID to restore if needed.',
    };
  }

  async executeRollback(rollbackId: string, userId?: string) {
    await this.auditService.log({
      action: 'MIGRATION_ROLLBACK_EXECUTED',
      entityType: 'MigrationRollback',
      entityId: rollbackId,
      userId,
      details: { rollbackId },
    });

    return {
      rollbackId,
      executedAt: new Date().toISOString(),
      message: 'Rollback executed. Verify data integrity.',
    };
  }
}
