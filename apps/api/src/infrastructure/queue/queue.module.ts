import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
})
export class QueueModule {}
