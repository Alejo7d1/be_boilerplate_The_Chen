import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/index.js';
import { NotificationRepository } from './repositories/index.js';
import { UserNotificationsService } from './services/index.js';

@Module({
  controllers: [NotificationsController],
  providers: [UserNotificationsService, NotificationRepository],
  // La cancelación de clases (H6) registra sus avisos a través de este servicio.
  exports: [UserNotificationsService],
})
export class NotificationsModule {}
