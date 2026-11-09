import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import {
  AlreadyReservedError,
  SessionFullError,
  SessionNotFoundError,
  SessionNotScheduledError,
} from '../errors/index.js';

export interface MembershipSnapshot {
  id: string;
  planType: 'MENSUAL' | 'TRIMESTRAL' | 'CLASES_SUELTAS';
  endDate: Date | null;
  remainingClasses: number | null;
}

export interface ReserveSpotInput {
  sessionId: string;
  memberId: string;
  /** Si viene, se descuenta 1 clase de esa membresía dentro de la misma transacción (plan por clases). */
  consumeClassFromMembershipId?: string;
}

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: reemplazar por el repositorio de memberships de H1 cuando esté en develop.
  async findLatestMembership(userId: string): Promise<MembershipSnapshot | null> {
    const m = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { type: true } } },
    });
    return m
      ? { id: m.id, planType: m.plan.type, endDate: m.endDate, remainingClasses: m.remainingClasses }
      : null;
  }

  /** Verifica cupo y registra la reserva de forma atómica (transacción Serializable). */
  async reserveSpot(input: ReserveSpotInput): Promise<{ id: string }> {
    const { sessionId, memberId, consumeClassFromMembershipId } = input;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const session = await tx.classSession.findUnique({ where: { id: sessionId } });
          if (!session) throw new SessionNotFoundError(sessionId);
          if (session.status !== 'Programada') throw new SessionNotScheduledError(sessionId);

          const active = await tx.reservation.count({ where: { sessionId, status: 'Activa' } });
          if (active >= session.capacity) throw new SessionFullError(sessionId);

          const previous = await tx.reservation.findUnique({
            where: { sessionId_memberId: { sessionId, memberId } },
          });
          if (previous?.status === 'Activa') throw new AlreadyReservedError(sessionId);

          const reservation = previous
            ? await tx.reservation.update({
                where: { id: previous.id },
                data: { status: 'Activa', cancelledAt: null },
              })
            : await tx.reservation.create({ data: { sessionId, memberId } });

          if (consumeClassFromMembershipId) {
            await tx.membership.update({
              where: { id: consumeClassFromMembershipId },
              data: { remainingClasses: { decrement: 1 } },
            });
          }
          return { id: reservation.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2034: conflicto de serialización (pierde la carrera por el último cupo)
        if (error.code === 'P2034') throw new SessionFullError(sessionId);
        // P2002: unicidad (sessionId, memberId) por doble envío simultáneo
        if (error.code === 'P2002') throw new AlreadyReservedError(sessionId);
      }
      throw error;
    }
  }
}
