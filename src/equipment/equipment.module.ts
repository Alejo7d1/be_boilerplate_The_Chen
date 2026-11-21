import { Module } from '@nestjs/common';
import { EquipmentController } from './controllers/index.js';
import { EquipmentRepository } from './repositories/index.js';
import { EquipmentService } from './services/index.js';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentRepository],
})
export class EquipmentModule {}
