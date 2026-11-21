import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { toMachineStatus, type EquipmentStatus } from '../domain/index.js';
import type { Machine, MachineStatus } from '@PrismaClient';

@Injectable()
export class EquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ordenado por nombre, con filtro opcional por estado (H15). */
  findAll(status?: EquipmentStatus): Promise<Machine[]> {
    return this.prisma.machine.findMany({
      where: status ? { status: toMachineStatus(status) } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Cambia el estado y deja rastro en la bitácora (H14/H15). La bitácora es
   * inmutable por trigger, así que solo se inserta. Devuelve `null` si la
   * máquina no existe para que el servicio responda 404.
   */
  updateStatus(
    id: string,
    status: MachineStatus,
    reason: string | null,
    changedById: string,
  ): Promise<Machine | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.machine.findUnique({ where: { id } });
      if (!current) return null;

      const updated = await tx.machine.update({
        where: { id },
        data: { status, reason },
      });

      await tx.machineStatusLog.create({
        data: {
          machineId: id,
          previousStatus: current.status,
          newStatus: status,
          reason,
          changedById,
        },
      });

      return updated;
    });
  }
}
