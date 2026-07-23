import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventHandler } from './notification.event-handler';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEventHandler],
  exports: [NotificationService],
})
export class NotificationModule {}
