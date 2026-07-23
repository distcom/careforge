import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { BatchJob } from '../queue.service';

@Processor('batch')
export class BatchProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process('statement_generation')
  async handleStatementGeneration(job: Job<BatchJob>) {
    const { items } = job.data;
    const results: any[] = [];

    for (const item of items) {
      try {
        // Generate statement for patient with outstanding balance
        const charges = await this.prisma.charge.findMany({
          where: { patientId: item.patientId, status: { in: ['PENDING', 'BILLED'] } },
        });
        const payments = await this.prisma.payment.findMany({
          where: { patientId: item.patientId },
        });

        const totalCharges = charges.reduce((sum, c) => sum + Number(c.fee), 0);
        const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = totalCharges - totalPayments;

        if (balance > 0) {
          results.push({
            patientId: item.patientId,
            statementNumber: `STMT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            balance,
            chargeCount: charges.length,
            generatedAt: new Date().toISOString(),
          });
        }

        await job.progress(items.indexOf(item) / items.length * 100);
      } catch (error) {
        results.push({ patientId: item.patientId, error: String(error) });
      }
    }

    return { processed: results.length, results };
  }

  @Process('claim_submission')
  async handleClaimSubmission(job: Job<BatchJob>) {
    const { items } = job.data;
    const results: any[] = [];

    for (const claimId of items) {
      try {
        const claim = await this.prisma.claim.findUnique({
          where: { id: claimId },
          include: { items: true },
        });

        if (!claim || claim.status !== 'DRAFT') {
          results.push({ claimId, status: 'skipped', reason: 'Not in DRAFT status' });
          continue;
        }

        // Generate X12 837 structure (simplified)
        const x12Payload = this.generate837(claim);

        await this.prisma.claim.update({
          where: { id: claimId },
          data: { status: 'SUBMITTED', submittedAt: new Date() },
        });

        results.push({ claimId, status: 'submitted', x12Length: x12Payload.length });
        await job.progress(items.indexOf(claimId) / items.length * 100);
      } catch (error) {
        results.push({ claimId, status: 'error', error: String(error) });
      }
    }

    return { processed: results.length, results };
  }

  @Process('eligibility_check')
  async handleEligibilityCheck(job: Job<BatchJob>) {
    const { items } = job.data;
    const results: any[] = [];

    for (const item of items) {
      try {
        // Generate 270 eligibility inquiry structure
        const inquiry = {
          transactionType: '270',
          patientId: item.patientId,
          payerId: item.payerId,
          memberId: item.memberId,
          serviceDate: new Date().toISOString().split('T')[0],
        };

        // In production: submit to clearinghouse and await 271 response
        results.push({
          patientId: item.patientId,
          status: 'inquiry_sent',
          inquiry,
        });

        await job.progress(items.indexOf(item) / items.length * 100);
      } catch (error) {
        results.push({ patientId: item.patientId, status: 'error', error: String(error) });
      }
    }

    return { processed: results.length, results };
  }

  @Process('data_export')
  async handleDataExport(job: Job<BatchJob>) {
    const { items, metadata } = job.data;
    // Export patient data (for patient requests / HIPAA right of access)
    const results: any[] = [];

    for (const patientId of items) {
      try {
        const patient = await this.prisma.patient.findUnique({
          where: { id: patientId },
          include: {
            encounters: { take: 100, orderBy: { createdAt: 'desc' } },
            conditions: true,
            medications: true,
            allergies: true,
            immunizations: true,
          },
        });

        if (patient) {
          results.push({
            patientId,
            exportedAt: new Date().toISOString(),
            recordCount: {
              encounters: patient.encounters.length,
              conditions: patient.conditions.length,
              medications: patient.medications.length,
              allergies: patient.allergies.length,
              immunizations: patient.immunizations.length,
            },
          });
        }
      } catch (error) {
        results.push({ patientId, error: String(error) });
      }
    }

    return { exportedBy: metadata?.requestedBy, results };
  }

  private generate837(claim: any): string {
    // Simplified X12 837P structure
    const segments: string[] = [
      'ISA*00*          *00*          *ZZ*CareForge      *ZZ*PAYER          *' + this.getDate() + '*' + this.getTime() + '*^*00501*000000001*0*P*:~',
      'GS*HC*CareForge*PAYER*' + this.getDate() + '*' + this.getTime() + '*1*X*005010X222A1~',
      'ST*837*0001*005010X222A1~',
      'BHT*0019*00*' + claim.claimNumber + '*' + this.getDate() + '*' + this.getTime() + '*CH~',
      'NM1*41*2*CareForge Medical*****46*1234567890~',
      'NM1*40*2*PAYER*****46*' + (claim.payerId || '0000000000') + '~',
      'CLM*' + claim.id + '*' + claim.totalAmount + '***11:B:1*Y*A*Y*Y~',
    ];

    if (claim.items) {
      for (let i = 0; i < claim.items.length; i++) {
        const item = claim.items[i];
        segments.push(`LX*${i + 1}~`);
        segments.push(`SV1*HC:${item.cptCode}*${item.amount}*UN*1***1~`);
        segments.push(`DTP*472*D8*${this.getDate()}~`);
      }
    }

    segments.push('SE*' + segments.length + '*0001~');
    segments.push('GE*1*1~');
    segments.push('IEA*1*000000001~');

    return segments.join('\n');
  }

  private getDate(): string {
    return new Date().toISOString().slice(2, 10).replace(/-/g, '');
  }

  private getTime(): string {
    return new Date().toTimeString().slice(0, 4).replace(':', '');
  }
}
