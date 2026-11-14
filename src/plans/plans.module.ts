import { Module } from '@nestjs/common';
import { PlansController } from './controllers/index.js';
import { PlanRepository } from './repositories/index.js';
import { PlansService } from './services/index.js';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanRepository],
  exports: [PlanRepository],
})
export class PlansModule {}
