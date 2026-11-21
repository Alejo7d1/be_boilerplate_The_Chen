import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/index.js';
import { NotificationRepository } from './repositories/index.js';
import {
  NotificationsService,
  UserNotificationsService,
} from './services/index.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    UserNotificationsService,
    NotificationRepository,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
