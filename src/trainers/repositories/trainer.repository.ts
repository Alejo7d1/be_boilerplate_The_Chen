import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { SlotNotFoundError } from '../errors/index.js';
import { Prisma, UserRole, type TrainerSlot, type User } from '@PrismaClient';

const NOT_FOUND = 'P2025';

@Injectable()
export class TrainerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTrainers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role: UserRole.ENTRENADOR, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  findTrainerById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, role: UserRole.ENTRENADOR, isActive: true },
    });
  }

  findSlots(trainerId: string, fromDate: Date): Promise<TrainerSlot[]> {
    return this.prisma.trainerSlot.findMany({
      where: { trainerId, date: { gte: fromDate } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  findSlotsForDate(trainerId: string, date: Date): Promise<TrainerSlot[]> {
    return this.prisma.trainerSlot.findMany({
      where: { trainerId, date },
      select: {
        id: true,
        trainerId: true,
        date: true,
        startTime: true,
        endTime: true,
        isBooked: true,
        createdAt: true,
      },
    });
  }

  findSlotById(id: string): Promise<TrainerSlot | null> {
    return this.prisma.trainerSlot.findUnique({ where: { id } });
  }

  createSlot(data: {
    trainerId: string;
    date: Date;
    startTime: string;
    endTime: string;
  }): Promise<TrainerSlot> {
    return this.prisma.trainerSlot.create({ data });
  }

  async deleteSlot(id: string): Promise<void> {
    try {
      await this.prisma.trainerSlot.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === NOT_FOUND
      ) {
        throw new SlotNotFoundError(id);
      }
      throw error;
    }
  }
}
