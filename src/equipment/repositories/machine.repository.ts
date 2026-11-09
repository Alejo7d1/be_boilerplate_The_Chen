import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { MachineStatus, type Machine } from '@PrismaClient';

@Injectable()
export class MachineRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Machine[]> {
    return this.prisma.machine.findMany({ orderBy: { name: 'asc' } });
  }

  async updateStatus(
    machineId: string,
    status: MachineStatus,
    reason: string | null,
    changedById: string,
  ): Promise<Machine | null> {
    return this.prisma.$transaction(async (transaction) => {
      const machine = await transaction.machine.findUnique({
        where: { id: machineId },
      });
      if (!machine) return null;

      const updated = await transaction.machine.update({
        where: { id: machineId },
        data: { status, reason },
      });

      await transaction.machineStatusLog.create({
        data: {
          machineId,
          previousStatus: machine.status,
          newStatus: status,
          reason,
          changedById,
        },
      });

      return updated;
    });
  }
}
