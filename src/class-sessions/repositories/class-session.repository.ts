import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';

export interface UpcomingClassRow {
  id: string;
  name: string;
  trainerName: string;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  activeReservations: number;
}

@Injectable()
export class ClassSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUpcoming(from: Date, to: Date): Promise<UpcomingClassRow[]> {
    const rows = await this.prisma.classSession.findMany({
      where: { status: 'Programada', startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: 'asc' },
      include: {
        trainer: { select: { email: true } }, // el boilerplate no tiene nombre: usa el campo que exista (firstName/lastName tras H-registro)
        _count: { select: { reservations: { where: { status: 'Activa' } } } },
      },
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      trainerName: s.trainer.email,
      startsAt: s.startsAt,
      durationMin: s.durationMin,
      capacity: s.capacity,
      activeReservations: s._count.reservations,
    }));
  }
}
