import { Module } from '@nestjs/common';
import {
  TrainerAvailabilityController,
  TrainersController,
} from './controllers/index.js';
import { TrainerRepository } from './repositories/index.js';
import { TrainersService } from './services/index.js';

@Module({
  controllers: [TrainersController, TrainerAvailabilityController],
  providers: [TrainersService, TrainerRepository],
  exports: [TrainerRepository],
})
export class TrainersModule {}
