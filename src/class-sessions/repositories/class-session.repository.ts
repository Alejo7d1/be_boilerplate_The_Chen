import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  ClassNotCancellableError,
  SessionNotFoundError,
  TrainerNotFoundError,
} from '../errors/index.js';
import { Prisma, UserRole, type ClassSessionStatus } from '@PrismaClient';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ClassRow {
  id: string;
  name: string;
  trainerName: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  reservedCount: number;
  status: ClassSessionStatus;
}

export interface ClassData {
  name: string;
  trainerId: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
}

export interface CancelledClass {
  session: ClassRow;
  recipients: { email: string; name: string }[];
}

@Injectable()
export class ClassSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUpcoming(from: Date, to: Date): Promise<ClassRow[]> {
    const rows = await this.prisma.classSession.findMany({
      where: { status: 'Programada', startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: 'asc' },
      include: {
        trainer: { select: { email: true, name: true } },
        _count: { select: { reservations: { where: { status: 'Activa' } } } },
      },
    });
    return rows.map((row) => this.toRow(row));
  }

  async findById(id: string): Promise<ClassRow | null> {
    const row = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        trainer: { select: { email: true, name: true } },
        _count: { select: { reservations: { where: { status: 'Activa' } } } },
      },
    });
    return row ? this.toRow(row) : null;
  }

  async trainerExists(trainerId: string): Promise<boolean> {
    const trainer = await this.prisma.user.findFirst({
      where: { id: trainerId, role: UserRole.ENTRENADOR, isActive: true },
      select: { id: true },
    });
    return trainer !== null;
  }

  async assertTrainerExists(trainerId: string): Promise<void> {
    if (!(await this.trainerExists(trainerId))) {
      throw new TrainerNotFoundError(trainerId);
    }
  }

  /** Solapamiento del mismo entrenador considerando la duración real. */
  async hasOverlap(
    trainerId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const candidates = await this.prisma.classSession.findMany({
      where: {
        trainerId,
        status: 'Programada',
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startsAt: {
          gte: new Date(startsAt.getTime() - DAY_MS),
          lte: new Date(endsAt.getTime() + DAY_MS),
        },
      },
      select: { startsAt: true, durationMin: true },
    });

    return candidates.some((candidate) => {
      const candidateEnd = new Date(
        candidate.startsAt.getTime() + candidate.durationMin * 60_000,
      );
      return candidate.startsAt < endsAt && candidateEnd > startsAt;
    });
  }

  async create(data: ClassData): Promise<ClassRow> {
    const row = await this.prisma.classSession.create({
      data: {
        name: data.name,
        trainerId: data.trainerId,
        startsAt: data.startsAt,
        durationMin: data.durationMin,
        capacity: data.capacity,
      },
      include: {
        trainer: { select: { email: true, name: true } },
        _count: { select: { reservations: { where: { status: 'Activa' } } } },
      },
    });
    return this.toRow(row);
  }

  async update(id: string, data: ClassData): Promise<ClassRow> {
    const row = await this.prisma.classSession.update({
      where: { id },
      data: {
        name: data.name,
        trainerId: data.trainerId,
        startsAt: data.startsAt,
        durationMin: data.durationMin,
        capacity: data.capacity,
      },
      include: {
        trainer: { select: { email: true, name: true } },
        _count: { select: { reservations: { where: { status: 'Activa' } } } },
      },
    });
    return this.toRow(row);
  }

  /**
   * Cancela la clase y sus reservas activas en una sola transacción. Devuelve
   * los miembros afectados para que el servicio dispare la notificación.
   */
  async cancel(id: string): Promise<CancelledClass> {
    return this.prisma.$transaction(
      async (tx) => {
        const session = await tx.classSession.findUnique({
          where: { id },
          include: {
            trainer: { select: { email: true, name: true } },
            reservations: {
              where: { status: 'Activa' },
              include: { member: { select: { email: true, name: true } } },
            },
          },
        });

        if (!session) throw new SessionNotFoundError(id);
        if (session.status !== 'Programada')
          throw new ClassNotCancellableError(id);

        const cancelledAt = new Date();
        await tx.reservation.updateMany({
          where: { sessionId: id, status: 'Activa' },
          data: { status: 'Cancelada', cancelledAt },
        });
        await tx.classSession.update({
          where: { id },
          data: { status: 'Cancelada' },
        });

        return {
          session: {
            id: session.id,
            name: session.name,
            trainerName: session.trainer.name || session.trainer.email,
            startsAt: session.startsAt,
            durationMin: session.durationMin,
            capacity: session.capacity,
            reservedCount: 0,
            status: 'Cancelada' as ClassSessionStatus,
          },
          recipients: session.reservations.map(
            (reservation) => reservation.member,
          ),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private toRow(row: {
    id: string;
    name: string;
    startsAt: Date;
    durationMin: number;
    capacity: number;
    status: ClassSessionStatus;
    trainer: { email: string; name: string };
    _count: { reservations: number };
  }): ClassRow {
    return {
      id: row.id,
      name: row.name,
      trainerName: row.trainer.name || row.trainer.email,
      startsAt: row.startsAt,
      durationMin: row.durationMin,
      capacity: row.capacity,
      reservedCount: row._count.reservations,
      status: row.status,
    };
  }
}
