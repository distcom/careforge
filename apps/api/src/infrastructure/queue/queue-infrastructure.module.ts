import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueModule } from './queue.module';
import { NotificationProcessor } from './processors/notification.processor';
import { ReminderProcessor } from './processors/reminder.processor';
import { BatchProcessor } from './processors/batch.processor';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'reminders' },
      { name: 'batch' },
      { name: 'reports' },
    ),
    QueueModule,
  ],
  providers: [NotificationProcessor, ReminderProcessor, BatchProcessor, QueueService],
  exports: [QueueService],
})
export class QueueInfrastructureModule {}
