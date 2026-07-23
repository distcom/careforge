import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ReminderJob } from '../queue.service';

@Processor('reminders')
export class ReminderProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Process('appointment')
  async handleAppointmentReminder(job: Job<ReminderJob>) {
    const { appointmentId, patientEmail, patientPhone, providerName, startTime, type } = job.data;

    // Verify appointment still exists and is active
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });

    if (!appointment || ['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      return { skipped: true, reason: 'Appointment no longer active' };
    }

    const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

    if (type === 'email' && (patientEmail || appointment.patient.email)) {
      await this.mailService.sendMail({
        to: patientEmail || appointment.patient.email,
        subject: `Appointment Reminder - ${new Date(startTime).toLocaleDateString()}`,
        html: `
          <h2>Appointment Reminder</h2>
          <p>Dear ${patientName},</p>
          <p>This is a reminder for your upcoming appointment:</p>
          <ul>
            <li><strong>Provider:</strong> ${providerName}</li>
            <li><strong>Date:</strong> ${new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Time:</strong> ${new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
          </ul>
          <p>Please arrive 15 minutes early. Bring your insurance card and photo ID.</p>
          <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
          <p>— CareForge Medical</p>
        `,
      });
    }

    if (type === 'sms' && (patientPhone || appointment.patient.phone)) {
      const smsMessage = `CareForge Reminder: Appointment with ${providerName} on ${new Date(startTime).toLocaleDateString()} at ${new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Reply C to cancel.`;
      console.log(`[SMS Reminder] To: ${patientPhone || appointment.patient.phone} | ${smsMessage}`);
      // In production: integrate with Twilio/SMS gateway
    }

    return { sent: true, type, appointmentId };
  }

  @Process('daily-schedule')
  async handleDailyScheduleReminder(job: Job) {
    // Send next-day schedule summary to all providers
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: { gte: tomorrow, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Group by provider
    const byProvider = new Map<string, typeof appointments>();
    for (const apt of appointments) {
      const key = apt.providerId;
      if (!byProvider.has(key)) byProvider.set(key, []);
      byProvider.get(key)!.push(apt);
    }

    for (const [providerId, apts] of byProvider) {
      const provider = apts[0].provider;
      if (provider?.email) {
        const scheduleHtml = apts
          .map((a) => `<li>${new Date(a.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${a.patient.firstName} ${a.patient.lastName} (${a.type})</li>`)
          .join('');

        await this.mailService.sendMail({
          to: provider.email,
          subject: `Tomorrow's Schedule - ${apts.length} appointments`,
          html: `<h2>Schedule for ${tomorrow.toLocaleDateString()}</h2><ul>${scheduleHtml}</ul>`,
        });
      }
    }

    return { providersNotified: byProvider.size, totalAppointments: appointments.length };
  }
}
