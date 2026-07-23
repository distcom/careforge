import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface SmsJob {
  to: string;
  message: string;
}

export interface ReminderJob {
  appointmentId: string;
  patientId: string;
  patientEmail?: string;
  patientPhone?: string;
  providerName: string;
  startTime: Date;
  type: 'email' | 'sms';
}

export interface ReportJob {
  reportType: string;
  params: Record<string, any>;
  format: 'pdf' | 'csv' | 'xlsx';
  requestedBy: string;
}

export interface BatchJob {
  type: 'statement_generation' | 'claim_submission' | 'eligibility_check' | 'data_export';
  items: any[];
  metadata?: Record<string, any>;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('reminders') private remindersQueue: Queue,
    @InjectQueue('batch') private batchQueue: Queue,
    @InjectQueue('reports') private reportsQueue: Queue,
  ) {}

  async queueEmail(job: EmailJob) {
    return this.notificationsQueue.add('email', job, {
      priority: 2,
      delay: 0,
    });
  }

  async queueSms(job: SmsJob) {
    return this.notificationsQueue.add('sms', job, {
      priority: 1,
      delay: 0,
    });
  }

  async queueAppointmentReminder(job: ReminderJob, delayMs: number) {
    return this.remindersQueue.add('appointment', job, {
      delay: delayMs,
      jobId: `reminder-${job.appointmentId}-${job.type}`,
    });
  }

  async cancelAppointmentReminder(appointmentId: string) {
    const emailJob = await this.remindersQueue.getJob(`reminder-${appointmentId}-email`);
    const smsJob = await this.remindersQueue.getJob(`reminder-${appointmentId}-sms`);
    if (emailJob) await emailJob.remove();
    if (smsJob) await smsJob.remove();
  }

  async queueReport(job: ReportJob) {
    return this.reportsQueue.add('generate', job, {
      priority: 3,
    });
  }

  async queueBatch(job: BatchJob) {
    return this.batchQueue.add(job.type, job, {
      priority: 5,
    });
  }

  async getQueueStats() {
    const [notifCounts, reminderCounts, batchCounts, reportCounts] = await Promise.all([
      this.notificationsQueue.getJobCounts(),
      this.remindersQueue.getJobCounts(),
      this.batchQueue.getJobCounts(),
      this.reportsQueue.getJobCounts(),
    ]);

    return {
      notifications: notifCounts,
      reminders: reminderCounts,
      batch: batchCounts,
      reports: reportCounts,
    };
  }
}
