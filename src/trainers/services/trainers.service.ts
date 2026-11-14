import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidSlotError,
  SlotBookedError,
  SlotNotFoundError,
  SlotOverlapError,
  TrainerNotFoundError,
} from '../errors/index.js';
import {
  TrainerListResponseDto,
  TrainerResponseDto,
  TrainerSlotListResponseDto,
  TrainerSlotResponseDto,
  type CreateTrainerSlotDto,
} from '../dto/index.js';
import { TrainerRepository } from '../repositories/index.js';
import type { User } from '@PrismaClient';

const SLOT_MINUTES = 60;
const MIN_START = 6 * 60;
const MAX_START = 21 * 60;

@Injectable()
export class TrainersService {
  constructor(private readonly trainers: TrainerRepository) {}

  async list(): Promise<TrainerListResponseDto> {
    const rows = await this.trainers.findTrainers();
    return { data: rows.map((row) => TrainerResponseDto.fromEntity(row)) };
  }

  async createSlot(
    trainerId: string,
    dto: CreateTrainerSlotDto,
  ): Promise<TrainerSlotResponseDto> {
    try {
      const date = this.parseDate(dto.date);
      const start = this.parseTime(dto.startTime);

      if (start < MIN_START || start > MAX_START) {
        throw new InvalidSlotError('El horario debe estar entre 06:00 y 21:00');
      }

      const startsAt = new Date(`${dto.date}T${dto.startTime}:00`);
      if (startsAt.getTime() <= Date.now()) {
        throw new InvalidSlotError(
          'No se pueden registrar bloques en el pasado',
        );
      }

      const endTime = this.formatTime(start + SLOT_MINUTES);
      const existing = await this.trainers.findSlotsForDate(trainerId, date);
      const overlaps = existing.some((slot) => {
        const existingStart = this.parseTime(slot.startTime);
        const existingEnd = this.parseTime(slot.endTime);
        return start < existingEnd && start + SLOT_MINUTES > existingStart;
      });
      if (overlaps) throw new SlotOverlapError(trainerId);

      const slot = await this.trainers.createSlot({
        trainerId,
        date,
        startTime: dto.startTime,
        endTime,
      });
      return TrainerSlotResponseDto.fromEntity(slot);
    } catch (error) {
      this.translate(error);
      throw error;
    }
  }

  async listAvailability(
    requester: User,
    trainerId: string,
  ): Promise<TrainerSlotListResponseDto> {
    const trainer = await this.trainers.findTrainerById(trainerId);
    if (!trainer) throw new NotFoundException('El entrenador no existe');

    if (requester.role === 'ENTRENADOR' && requester.id !== trainerId) {
      throw new ForbiddenException(
        'Solo puedes consultar tu propia disponibilidad',
      );
    }

    const slots = await this.trainers.findSlots(trainerId, this.today());
    return {
      data: slots.map((slot) => TrainerSlotResponseDto.fromEntity(slot)),
    };
  }

  async deleteSlot(trainerId: string, slotId: string): Promise<void> {
    const slot = await this.trainers.findSlotById(slotId);
    // No se revela la existencia de bloques de otro entrenador.
    if (!slot || slot.trainerId !== trainerId) {
      throw new NotFoundException('El bloque no existe');
    }
    if (slot.isBooked) {
      throw new ConflictException(
        'El bloque ya está reservado por una sesión personal',
      );
    }

    try {
      await this.trainers.deleteSlot(slotId);
    } catch (error) {
      if (error instanceof SlotNotFoundError) {
        throw new NotFoundException('El bloque no existe');
      }
      throw error;
    }
  }

  private translate(error: unknown): void {
    if (error instanceof InvalidSlotError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof SlotOverlapError) {
      throw new ConflictException(
        'Ya existe un bloque que se cruza con ese horario',
      );
    }
    if (error instanceof SlotBookedError) {
      throw new ConflictException('El bloque ya está reservado');
    }
    if (error instanceof TrainerNotFoundError) {
      throw new NotFoundException('El entrenador no existe');
    }
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new InvalidSlotError('La fecha no es válida');
    }
    return date;
  }

  private parseTime(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(totalMinutes: number): string {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
