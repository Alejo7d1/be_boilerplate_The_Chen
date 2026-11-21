import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EquipmentListResponseDto,
  EquipmentResponseDto,
  MIN_REASON_LENGTH,
  type UpdateEquipmentStatusDto,
} from '../dto/index.js';
import { toMachineStatus, type EquipmentStatus } from '../domain/index.js';
import { EquipmentRepository } from '../repositories/index.js';

const OPERATIVA: EquipmentStatus = 'Operativa';

@Injectable()
export class EquipmentService {
  constructor(private readonly equipment: EquipmentRepository) {}

  async list(status?: EquipmentStatus): Promise<EquipmentListResponseDto> {
    const machines = await this.equipment.findAll(status);
    return {
      data: machines.map((machine) =>
        EquipmentResponseDto.fromEntity(machine),
      ),
    };
  }

  /**
   * Una máquina fuera de servicio necesita motivo (lo exige también un CHECK
   * en la base); al volver a `Operativa` el motivo se limpia.
   */
  async changeStatus(
    id: string,
    dto: UpdateEquipmentStatusDto,
    changedById: string,
  ): Promise<EquipmentResponseDto> {
    const reason = this.resolveReason(dto);

    const updated = await this.equipment.updateStatus(
      id,
      toMachineStatus(dto.status),
      reason,
      changedById,
    );
    if (!updated) throw new NotFoundException('La máquina no existe');

    return EquipmentResponseDto.fromEntity(updated);
  }

  private resolveReason(dto: UpdateEquipmentStatusDto): string | null {
    if (dto.status === OPERATIVA) return null;

    const reason = dto.reason?.trim() ?? '';
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException(
        `El motivo es obligatorio (mínimo ${MIN_REASON_LENGTH} caracteres) cuando el estado no es ${OPERATIVA}`,
      );
    }
    return reason;
  }
}
