import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Notification } from '@PrismaClient';

export interface NotificationPage {
  items: Notification[];
  total: number;
  unreadCount: number;
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
}
