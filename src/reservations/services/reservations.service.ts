import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRepository } from '@Memberships/repositories';
import { isMembershipActive } from '@Memberships/domain';
import {
  CancelReservationResponseDto,
  ReservationListResponseDto,
  ReservationResponseDto,
} from '../dto/index.js';
import {
  CancellationWindowClosedError,
  ReservationAlreadyCancelledError,
  ReservationNotFoundError,
} from '../errors/index.js';
import { MemberReservationRepository } from '../repositories/index.js';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservations: MemberReservationRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async findMine(memberId: string): Promise<ReservationListResponseDto> {
    const rows = await this.reservations.findByMember(memberId);
    return { data: rows.map((row) => ReservationResponseDto.fromEntity(row)) };
  }

  async cancel(
    reservationId: string,
    memberId: string,
  ): Promise<CancelReservationResponseDto> {
    const membership = await this.memberships.findLatestByUser(memberId);
    if (!isMembershipActive(membership)) {
      throw new ForbiddenException('Tu membresía está vencida');
    }

    try {
      const cancelled = await this.reservations.cancel(reservationId, memberId);
      return {
        reservationId: cancelled.id,
        status: 'Cancelada',
        message: 'Reserva cancelada exitosamente',
      };
    } catch (error) {
      if (error instanceof ReservationNotFoundError) {
        throw new NotFoundException('La reserva no existe');
      }
      if (error instanceof ReservationAlreadyCancelledError) {
        throw new ConflictException('La reserva ya fue cancelada');
      }
      if (error instanceof CancellationWindowClosedError) {
        throw new BadRequestException(
          'No es posible cancelar con menos de 2 horas de anticipación',
        );
      }
      throw error;
    }
  }
}
