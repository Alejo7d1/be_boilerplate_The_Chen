import { Module } from '@nestjs/common';
import { ProgressController } from './controllers/index.js';
import { ProgressRepository } from './repositories/index.js';
import { ProgressService } from './services/index.js';

@Module({
  controllers: [ProgressController],
  providers: [ProgressService, ProgressRepository],
})
export class ProgressModule {}
