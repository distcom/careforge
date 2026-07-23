import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.from = this.configService.get('EMAIL_FROM', 'noreply@careforge.health');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: false,
      auth: this.configService.get('SMTP_USER')
        ? {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  async send(options: MailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      throw error;
    }
  }

  async sendTemplate(to: string, subject: string, template: string, data: Record<string, string>): Promise<void> {
    let html = template;
    for (const [key, value] of Object.entries(data)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    await this.send({ to, subject, html });
  }

  async sendAppointmentReminder(to: string, patientName: string, date: string, provider: string): Promise<void> {
    await this.send({
      to,
      subject: 'Appointment Reminder - CareForge',
      html: `
        <h2>Appointment Reminder</h2>
        <p>Dear ${patientName},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Provider:</strong> ${provider}</li>
        </ul>
        <p>If you need to reschedule, please contact us.</p>
        <p>CareForge Health</p>
      `,
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    await this.send({
      to,
      subject: 'Password Reset - CareForge',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${appUrl}/reset-password?token=${resetToken}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }
}
