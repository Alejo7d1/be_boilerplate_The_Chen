import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassSessionResponseDto, ReserveResponseDto } from '../dto/index.js';
import {
  AlreadyReservedError,
  SessionFullError,
  SessionNotFoundError,
  SessionNotScheduledError,
} from '../errors/index.js';
import {
  ClassSessionRepository,
  type MembershipSnapshot,
  ReservationRepository,
} from '../repositories/index.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Regla 1.5 del documento de historias. */
function isMembershipActive(m: MembershipSnapshot | null): boolean {
  if (!m) return false;
  if (m.planType === 'CLASES_SUELTAS') return (m.remainingClasses ?? 0) > 0;
  if (!m.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return m.endDate >= today;
}

@Injectable()
export class ClassSessionsService {
  constructor(
    private readonly sessions: ClassSessionRepository,
    private readonly reservations: ReservationRepository,
  ) {}

  async listUpcoming(): Promise<ClassSessionResponseDto[]> {
    const now = new Date();
    const rows = await this.sessions.findUpcoming(
      now,
      new Date(now.getTime() + WEEK_MS),
    );
    return rows.map((row) => ClassSessionResponseDto.fromRow(row));
  }

  async reserve(
    sessionId: string,
    memberId: string,
  ): Promise<ReserveResponseDto> {
    const membership = await this.reservations.findLatestMembership(memberId);
    if (!membership || !isMembershipActive(membership)) {
      throw new ForbiddenException('Tu membresía está vencida');
    }

    try {
      const { id } = await this.reservations.reserveSpot({
        sessionId,
        memberId,
        consumeClassFromMembershipId:
          membership.planType === 'CLASES_SUELTAS' ? membership.id : undefined,
      });
      return {
        reservationId: id,
        status: 'Activa',
        message: 'Reserva confirmada',
      };
    } catch (error) {
      if (error instanceof SessionNotFoundError)
        throw new NotFoundException('La clase no existe');
      if (error instanceof SessionNotScheduledError)
        throw new ConflictException('La clase no está disponible');
      if (error instanceof SessionFullError)
        throw new ConflictException('Clase sin cupos');
      if (error instanceof AlreadyReservedError)
        throw new ConflictException('Ya tienes una reserva para esta clase');
      throw error;
    }
  }
}
