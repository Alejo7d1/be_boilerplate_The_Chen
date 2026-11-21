import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isMembershipActive } from '@Memberships/domain';
import { MembershipRepository } from '@Memberships/repositories';
import { AccessResult } from '@PrismaClient';
import { CheckInResponseDto, type CheckInDto } from '../dto/index.js';
import { AccessRepository } from '../repositories/index.js';

/** Ventana de la regla "un ingreso cada 5 minutos". */
const REENTRY_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class AccessService {
  constructor(
    private readonly access: AccessRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async checkIn(
    dto: CheckInDto,
    registeredById: string,
  ): Promise<CheckInResponseDto> {
    if (!dto.cardNumber?.trim() && !dto.memberName?.trim()) {
      throw new BadRequestException(
        'Enviá el carné o el nombre completo del miembro',
      );
    }

    const member = await this.access.findMember(dto);
    if (!member) throw new NotFoundException('Carné no encontrado');

    const since = new Date(Date.now() - REENTRY_WINDOW_MS);
    if (await this.access.findLastAccepted(member.id, since)) {
      throw new ConflictException(
        'El miembro ya registró su ingreso hace menos de 5 minutos',
      );
    }

    const active = isMembershipActive(
      await this.memberships.findLatestByUser(member.id),
    );
    if (!active && dto.allowException !== true) {
      // El intento rechazado se guarda para auditoría, pero no cuenta para la
      // ventana anti-duplicado: recepción tiene que poder reintentar con
      // `allowException: true`.
      await this.access.create(
        member.id,
        AccessResult.Denegado,
        registeredById,
      );
      throw new ForbiddenException('La membresía del miembro está vencida');
    }

    const log = await this.access.create(
      member.id,
      active ? AccessResult.Permitido : AccessResult.Excepcion,
      registeredById,
    );

    return {
      accessId: log.id,
      memberName: member.name || member.email,
      result: log.result,
      timestamp: log.timestamp.toISOString(),
    };
  }
}
