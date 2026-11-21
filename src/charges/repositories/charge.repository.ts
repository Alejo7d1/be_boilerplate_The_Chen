import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { ChargeStatus, Prisma } from '@PrismaClient';

const PENDING_INCLUDE = {
  user: { select: { id: true, name: true, email: true, cardNumber: true } },
  plan: { select: { name: true } },
} as const;

export type PendingChargeRow = Prisma.ChargeGetPayload<{
  include: typeof PENDING_INCLUDE;
}>;

export interface PendingChargesFilter {
  page: number;
  limit: number;
  startDate?: Date;
  endDate?: Date;
  memberId?: string;
}

export interface PendingChargesPage {
  rows: PendingChargeRow[];
  total: number;
}

@Injectable()
export class ChargeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * H11: pendientes por fecha de emisión descendente, con paginación. El
   * índice `charges_status_created_at_idx` cubre exactamente este filtro.
   */
  async findPending({
    page,
    limit,
    startDate,
    endDate,
    memberId,
  }: PendingChargesFilter): Promise<PendingChargesPage> {
    const createdAt =
      startDate || endDate
        ? {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          }
        : undefined;

    const where: Prisma.ChargeWhereInput = {
      status: ChargeStatus.Pendiente,
      ...(memberId ? { userId: memberId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.charge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: PENDING_INCLUDE,
      }),
      this.prisma.charge.count({ where }),
    ]);

    return { rows, total };
  }
}
