import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '@Notifications/services';
import { ClassInputDto, type ClassSessionResponseDto } from '../dto/index.js';
import {
  ClassNotCancellableError,
  TrainerNotFoundError,
} from '../errors/index.js';
import {
  ClassSessionRepository,
  type ClassData,
} from '../repositories/index.js';

@Injectable()
export class ClassesService {
  constructor(
    private readonly sessions: ClassSessionRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: ClassInputDto): Promise<ClassSessionResponseDto> {
    const data = await this.toValidatedData(dto);
    const row = await this.sessions.create(data);
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: ClassInputDto,
  ): Promise<ClassSessionResponseDto> {
    const existing = await this.sessions.findById(id);
    if (!existing) throw new NotFoundException('La clase no existe');

    const data = await this.toValidatedData(dto, id);
    const row = await this.sessions.update(id, data);
    return this.toResponse(row);
  }

  async cancel(id: string, reason: string): Promise<ClassSessionResponseDto> {
    try {
      const { session, recipients } = await this.sessions.cancel(id);

      // Fire-and-forget: la cancelación ya está confirmada y no depende del
      // Servicio de Notificaciones.
      void this.notifications.notifyClassCancelled({
        type: 'CLASS_CANCELLED',
        classId: session.id,
        className: session.name,
        startsAt: session.startsAt.toISOString(),
        reason,
        recipients,
      });

      return this.toResponse(session);
    } catch (error) {
      if (error instanceof TrainerNotFoundError) {
        throw new NotFoundException('El entrenador no existe');
      }
      if (error instanceof ClassNotCancellableError) {
        throw new ConflictException('La clase ya finalizó o fue cancelada');
      }
      throw error;
    }
  }

  private async toValidatedData(
    dto: ClassInputDto,
    excludeId?: string,
  ): Promise<ClassData> {
    const startsAt = this.parseStart(dto.date, dto.startTime);
    const endsAt = new Date(startsAt.getTime() + dto.durationMinutes * 60_000);

    try {
      await this.sessions.assertTrainerExists(dto.trainerId);
    } catch (error) {
      if (error instanceof TrainerNotFoundError) {
        throw new NotFoundException('El entrenador no existe');
      }
      throw error;
    }

    if (
      await this.sessions.hasOverlap(dto.trainerId, startsAt, endsAt, excludeId)
    ) {
      throw new ConflictException(
        'El entrenador ya tiene una clase en ese horario',
      );
    }

    return {
      name: dto.name.trim(),
      trainerId: dto.trainerId,
      startsAt,
      durationMin: dto.durationMinutes,
      capacity: dto.maxCapacity,
    };
  }

  private parseStart(date: string, startTime: string): Date {
    const startsAt = new Date(`${date}T${startTime}:00`);
    const [year, month, day] = date.split('-').map(Number);
    if (
      Number.isNaN(startsAt.getTime()) ||
      startsAt.getFullYear() !== year ||
      startsAt.getMonth() + 1 !== month ||
      startsAt.getDate() !== day
    ) {
      throw new BadRequestException('La fecha u hora de inicio no es válida');
    }
    return startsAt;
  }

  private toResponse(row: {
    id: string;
    name: string;
    trainerName: string;
    startsAt: Date;
    durationMin: number;
    capacity: number;
    reservedCount: number;
    status: string;
  }): ClassSessionResponseDto {
    return {
      id: row.id,
      name: row.name,
      trainerName: row.trainerName,
      startsAt: row.startsAt.toISOString(),
      durationMin: row.durationMin,
      capacity: row.capacity,
      availableSpots: Math.max(row.capacity - row.reservedCount, 0),
      reservedCount: row.reservedCount,
      status: row.status,
    };
  }
}
