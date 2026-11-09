import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MachineStatus } from '@PrismaClient';
import { MachineRepository } from '@Equipment/repositories';
import type { MachineResponseDto, UpdateMachineStatusDto } from '@Equipment/dto';

@Injectable()
export class EquipmentService {
  constructor(private readonly machines: MachineRepository) {}

  async list(): Promise<MachineResponseDto[]> {
    return this.machines.findAll();
  }

  async updateStatus(
    machineId: string,
    dto: UpdateMachineStatusDto,
    changedById: string,
  ): Promise<MachineResponseDto> {
    const reason = dto.reason?.trim() || null;
    if (dto.status !== MachineStatus.OPERATIVA && !reason) {
      throw new BadRequestException(
        'El motivo es obligatorio cuando la máquina no está operativa.',
      );
    }

    const machine = await this.machines.updateStatus(
      machineId,
      dto.status,
      reason,
      changedById,
    );
    if (!machine) {
      throw new NotFoundException('La máquina no existe.');
    }
    return machine;
  }
}
