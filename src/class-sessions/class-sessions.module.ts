import { Module } from '@nestjs/common';
import { ClassSessionsController } from './controllers/index.js';
import { ClassSessionRepository, ReservationRepository } from './repositories/index.js';
import { ClassSessionsService } from './services/index.js';


@Module({
  controllers: [ClassSessionsController],
  providers: [ClassSessionsService, ClassSessionRepository, ReservationRepository],
  exports: [ClassSessionRepository, ReservationRepository], 
})
export class ClassSessionsModule {}
