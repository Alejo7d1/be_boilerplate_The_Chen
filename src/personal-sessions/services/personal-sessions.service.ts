import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRepository } from '@Memberships/repositories';
import { isMembershipActive } from '@Memberships/domain';
import {
  MembershipInactiveError,
  SlotAlreadyBookedError,
  SlotNotFoundError,
} from '../errors/index.js';
import {
  PersonalSessionResponseDto,
  type CreatePersonalSessionDto,
} from '../dto/index.js';
import { PersonalSessionRepository } from '../repositories/index.js';

@Injectable()
export class PersonalSessionsService {
  constructor(
    private readonly sessions: PersonalSessionRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async book(
    memberId: string,
    dto: CreatePersonalSessionDto,
  ): Promise<PersonalSessionResponseDto> {
    const membership = await this.memberships.findLatestByUser(memberId);
    if (!isMembershipActive(membership)) {
      throw new ForbiddenException('Tu membresía está vencida');
    }

    try {
      const { session, charge } = await this.sessions.book(
        memberId,
        dto.trainerId,
        dto.slotId,
      );
      return {
        sessionId: session.id,
        status: session.status,
        chargeId: charge.id,
      };
    } catch (error) {
      if (error instanceof SlotNotFoundError) {
        throw new NotFoundException('El entrenador o bloque no existe');
      }
      if (error instanceof SlotAlreadyBookedError) {
        throw new ConflictException('El bloque ya fue agendado');
      }
      if (error instanceof MembershipInactiveError) {
        throw new ForbiddenException('Tu membresía está vencida');
      }
      throw error;
    }
  }
}
