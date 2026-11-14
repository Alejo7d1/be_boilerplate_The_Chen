import { Module } from '@nestjs/common';
import { NotificationsModule } from '@Notifications';
import {
  ClassSessionsController,
  ClassesController,
} from './controllers/index.js';
import {
  ClassSessionRepository,
  ReservationRepository,
} from './repositories/index.js';
import { ClassesService, ClassSessionsService } from './services/index.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ClassSessionsController, ClassesController],
  providers: [
    ClassSessionsService,
    ClassesService,
    ClassSessionRepository,
    ReservationRepository,
  ],
  exports: [ClassSessionRepository, ReservationRepository],
})
export class ClassSessionsModule {}
