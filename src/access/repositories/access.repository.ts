import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { AccessResult, UserRole, type AccessLog, type User } from '@PrismaClient';

/** Ingresos que cuentan para no duplicar el registro del mismo día. */
const ACCEPTED_RESULTS: AccessResult[] = [
  AccessResult.Permitido,
  AccessResult.Excepcion,
];

export interface MemberLookup {
  cardNumber?: string;
  memberName?: string;
}

@Injectable()
export class AccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo miembros activos: el personal no registra ingreso al gimnasio. */
  findMember({ cardNumber, memberName }: MemberLookup): Promise<User | null> {
    const card = cardNumber?.trim();
    const name = memberName?.trim();

    if (card) {
      return this.prisma.user.findFirst({
        where: { cardNumber: card, role: UserRole.MIEMBRO, isActive: true },
      });
    }
    if (name) {
      return this.prisma.user.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          role: UserRole.MIEMBRO,
          isActive: true,
        },
      });
    }
    return Promise.resolve(null);
  }

  /** Último ingreso aceptado del miembro desde `since` (ventana anti-duplicado). */
  findLastAccepted(
    memberId: string,
    since: Date,
  ): Promise<AccessLog | null> {
    return this.prisma.accessLog.findFirst({
      where: {
        memberId,
        result: { in: ACCEPTED_RESULTS },
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  create(
    memberId: string,
    result: AccessResult,
    registeredById: string,
  ): Promise<AccessLog> {
    return this.prisma.accessLog.create({
      data: { memberId, result, registeredById },
    });
  }
}
