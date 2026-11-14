import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  CancellationWindowClosedError,
  ReservationAlreadyCancelledError,
  ReservationNotFoundError,
} from '../errors/index.js';
import { Prisma, type ReservationStatus } from '@PrismaClient';
import type { ReservationView } from '../dto/index.js';

const MIN_HOURS_BEFORE_START = 2;
const HOUR_MS = 60 * 60 * 1000;

interface ReservationRow {
  id: string;
  status: ReservationStatus;
  cancelledAt: Date | null;
  session: { id: string; name: string; startsAt: Date };
}

@Injectable()
export class MemberReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMember(memberId: string): Promise<ReservationView[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { memberId },
      orderBy: { session: { startsAt: 'asc' } },
      include: {
        session: { select: { id: true, name: true, startsAt: true } },
      },
    });
    return rows.map((row) => this.toView(row));
  }

  /** Cancela verificando propiedad y anticipación dentro de una transacción. */
  async cancel(
    reservationId: string,
    memberId: string,
  ): Promise<ReservationView> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const reservation = await tx.reservation.findUnique({
            where: { id: reservationId },
            include: {
              session: { select: { id: true, name: true, startsAt: true } },
            },
          });

          // Una reserva ajena responde 404 igual que una inexistente: no se
          // revela la existencia de reservas de otros miembros.
          if (!reservation || reservation.memberId !== memberId) {
            throw new ReservationNotFoundError(reservationId);
          }
          if (reservation.status === 'Cancelada') {
            throw new ReservationAlreadyCancelledError(reservationId);
          }

          const hoursLeft =
            (reservation.session.startsAt.getTime() - Date.now()) / HOUR_MS;
          if (hoursLeft < MIN_HOURS_BEFORE_START) {
            throw new CancellationWindowClosedError(reservationId);
          }

          const cancelledAt = new Date();
          const updated = await tx.reservation.update({
            where: { id: reservationId },
            data: { status: 'Cancelada', cancelledAt },
            include: {
              session: { select: { id: true, name: true, startsAt: true } },
            },
          });
          return this.toView(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ReservationAlreadyCancelledError(reservationId);
      }
      throw error;
    }
  }

  private toView(row: ReservationRow): ReservationView {
    return {
      id: row.id,
      classId: row.session.id,
      name: row.session.name,
      startsAt: row.session.startsAt,
      status: row.status,
      cancelledAt: row.cancelledAt,
    };
  }
}
