import { Module } from '@nestjs/common';
import { RoutinesController } from './controllers/index.js';
import { RoutineRepository } from './repositories/index.js';
import { RoutinesService } from './services/index.js';

@Module({
  controllers: [RoutinesController],
  providers: [RoutinesService, RoutineRepository],
})
export class RoutinesModule {}
