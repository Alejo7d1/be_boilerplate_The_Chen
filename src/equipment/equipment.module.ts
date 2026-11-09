import { Module } from '@nestjs/common';
import { EquipmentController } from '@Equipment/controllers';
import { MachineRepository } from '@Equipment/repositories';
import { EquipmentService } from '@Equipment/services';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, MachineRepository],
})
export class EquipmentModule {}
