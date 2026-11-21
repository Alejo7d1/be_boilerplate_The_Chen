import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { ChargeStatus, ClassSessionStatus, ReservationStatus } from '@PrismaClient';

export interface OccupancyRow {
  id: string;
  name: string;
  startsAt: Date;
  capacity: number;
  reservedCount: number;
}

export interface PaidCharge {
  id: string;
  membershipId: string | null;
  createdAt: Date;
}

export interface FinancialTotals {
  totalRevenue: number;
  paymentCount: number;
  renewals: number;
}

export interface ReportRange {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** H20: sesiones del rango con su ocupación real (reservas Activas). */
  async findOccupancy({
    from,
    to,
    classId,
  }: ReportRange & { classId?: string }): Promise<OccupancyRow[]> {
    const rows = await this.prisma.classSession.findMany({
      where: {
        startsAt: { gte: from, lte: to },
        status: { not: ClassSessionStatus.Cancelada },
        ...(classId ? { id: classId } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: {
        _count: {
          select: {
            reservations: { where: { status: ReservationStatus.Activa } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      startsAt: row.startsAt,
      capacity: row.capacity,
      reservedCount: row._count.reservations,
    }));
  }

  /** H21: ingresos del rango (cobros efectivamente pagados). */
  async findFinancial({ from, to }: ReportRange): Promise<FinancialTotals> {
    const where = {
      status: ChargeStatus.Pagada,
      paidAt: { gte: from, lte: to },
    };

    const [aggregate, paid] = await Promise.all([
      this.prisma.charge.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.charge.findMany({
        where,
        select: { id: true, membershipId: true, createdAt: true },
      }),
    ]);

    return {
      totalRevenue: Number(aggregate._sum?.amount ?? 0),
      paymentCount: aggregate._count._all,
      renewals: await this.countRenewals(paid),
    };
  }

  /**
   * Una renovación es un pago sobre una membresía que ya tenía cobros
   * anteriores. La compra inicial de la membresía no cuenta.
   */
  private async countRenewals(paid: PaidCharge[]): Promise<number> {
    const membershipIds = [
      ...new Set(
        paid
          .map((charge) => charge.membershipId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (membershipIds.length === 0) return 0;

    const firstCharges = await this.prisma.charge.groupBy({
      by: ['membershipId'],
      where: { membershipId: { in: membershipIds } },
      _min: { createdAt: true },
    });
    const firstChargeAt = new Map(
      firstCharges.map((row) => [
        row.membershipId,
        row._min.createdAt?.getTime() ?? 0,
      ]),
    );

    return paid.filter((charge) => {
      if (!charge.membershipId) return false;
      const first = firstChargeAt.get(charge.membershipId);
      return first !== undefined && first < charge.createdAt.getTime();
    }).length;
  }
}
