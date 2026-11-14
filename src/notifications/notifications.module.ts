import { Module } from '@nestjs/common';
import { NotificationsService } from './services/index.js';

@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
