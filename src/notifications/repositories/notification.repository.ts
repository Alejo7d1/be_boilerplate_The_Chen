import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Notification, NotificationSource } from '@PrismaClient';

export interface NotificationPage {
  items: Notification[];
  total: number;
  unreadCount: number;
}

export interface NewNotification {
  recipientId: string;
  title: string;
  message: string;
  sourceModule: NotificationSource;
  referenceId: string | null;
}

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
}

const READ = true;

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPageByRecipient(
    recipientId: string,
    page: number,
    pageSize: number,
  ): Promise<NotificationPage> {
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { recipientId } }),
      this.prisma.notification.count({
        where: { recipientId, isRead: !READ },
      }),
    ]);

    return { items, total, unreadCount };
  }

  findByIdForRecipient(
    id: string,
    recipientId: string,
  ): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: { id, recipientId },
    });
  }

  markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: READ },
    });
  }

  /** Usuarios activos entre los ids pedidos; los inexistentes no aparecen. */
  findActiveUsers(ids: string[]): Promise<ActiveUser[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true, email: true },
    });
  }

  /**
   * Miembros vinculados a un entrenador por cualquiera de sus tres vínculos:
   * reservas en sus clases, sesiones personales suyas o rutinas que asignó.
   * Es el alcance con el que un `ENTRENADOR` puede notificar.
   */
  async findTrainerMemberIds(trainerId: string): Promise<Set<string>> {
    const [reservations, personalSessions, routines] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { session: { trainerId } },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      this.prisma.personalSession.findMany({
        where: { slot: { trainerId } },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      this.prisma.routine.findMany({
        where: { trainerId },
        select: { memberId: true },
      }),
    ]);

    return new Set(
      [...reservations, ...personalSessions, ...routines].map(
        (row) => row.memberId,
      ),
    );
  }

  /** Una fila por destinatario: cada uno gestiona su propio estado de lectura. */
  createMany(rows: NewNotification[]): Promise<Notification[]> {
    if (rows.length === 0) return Promise.resolve([]);
    return this.prisma.notification.createManyAndReturn({ data: rows });
  }
}
