import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailService } from '../../mail/mail.service';
import { EmailJob, SmsJob } from '../queue.service';

@Processor('notifications')
export class NotificationProcessor {
  constructor(private readonly mailService: MailService) {}

  @Process('email')
  async handleEmail(job: Job<EmailJob>) {
    const { to, subject, template, data } = job.data;

    const html = this.renderTemplate(template, data);

    await this.mailService.sendMail({
      to,
      subject,
      html,
    });

    return { sent: true, to, template };
  }

  @Process('sms')
  async handleSms(job: Job<SmsJob>) {
    const { to, message } = job.data;

    // SMS gateway integration point (Twilio, etc.)
    // In production, this would call the SMS provider API
    console.log(`[SMS] To: ${to} | Message: ${message}`);

    return { sent: true, to };
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, (d: any) => string> = {
      'appointment-reminder': (d) => `
        <h2>Appointment Reminder</h2>
        <p>Dear ${d.patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Provider:</strong> ${d.providerName}</li>
          <li><strong>Date:</strong> ${new Date(d.startTime).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${new Date(d.startTime).toLocaleTimeString()}</li>
          <li><strong>Location:</strong> ${d.facilityName || 'Main Office'}</li>
        </ul>
        <p>Please arrive 15 minutes early. If you need to reschedule, contact us at least 24 hours in advance.</p>
        <p>— CareForge Medical</p>
      `,
      'password-reset': (d) => `
        <h2>Password Reset</h2>
        <p>Dear ${d.userName || 'User'},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${d.resetUrl}">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        <p>— CareForge Security Team</p>
      `,
      'lab-result-available': (d) => `
        <h2>Lab Results Available</h2>
        <p>Dear ${d.patientName},</p>
        <p>Your lab results for <strong>${d.testName}</strong> are now available.</p>
        <p>Log in to the Patient Portal to view your results.</p>
        <p>— CareForge Medical</p>
      `,
      'claim-status': (d) => `
        <h2>Claim Status Update</h2>
        <p>Dear ${d.patientName},</p>
        <p>Your claim <strong>${d.claimNumber}</strong> status has been updated to: <strong>${d.status}</strong>.</p>
        <p>Amount: $${d.amount}</p>
        <p>— CareForge Billing</p>
      `,
      'portal-welcome': (d) => `
        <h2>Welcome to CareForge Patient Portal</h2>
        <p>Dear ${d.patientName},</p>
        <p>Your patient portal account has been created. You can now:</p>
        <ul>
          <li>View upcoming appointments</li>
          <li>Access lab results</li>
          <li>Message your care team</li>
          <li>View and pay bills</li>
        </ul>
        <p><a href="${d.portalUrl}">Access Portal</a></p>
        <p>— CareForge Medical</p>
      `,
    };

    const renderer = templates[template];
    if (renderer) return renderer(data);

    // Generic fallback
    return `<h2>${data.subject || 'Notification'}</h2><p>${JSON.stringify(data)}</p>`;
  }
}
