import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  NOTIFICATIONS_PAGE_SIZE,
} from '../dto/index.js';
import { NotificationRepository } from '../repositories/index.js';

/**
 * Bandeja de notificaciones del usuario autenticado (H19).
 *
 * Se mantiene aparte de `NotificationsService`, que es el cliente saliente
 * hacia el Servicio de Notificaciones: acá se lee lo que ya está persistido.
 */
@Injectable()
export class UserNotificationsService {
  constructor(private readonly notifications: NotificationRepository) {}

  async list(
    recipientId: string,
    page = 1,
    limit = NOTIFICATIONS_PAGE_SIZE,
  ): Promise<NotificationListResponseDto> {
    const { items, total, unreadCount } =
      await this.notifications.findPageByRecipient(recipientId, page, limit);

    return {
      data: items.map((item) => NotificationResponseDto.fromEntity(item)),
      unreadCount,
      page,
      pageSize: limit,
      total,
    };
  }

  async markAsRead(
    id: string,
    recipientId: string,
  ): Promise<NotificationResponseDto> {
    // Se consulta antes de escribir para no responder 500 por id inexistente y
    // para que nadie pueda marcar como leída una notificación ajena.
    const existing = await this.notifications.findByIdForRecipient(
      id,
      recipientId,
    );
    if (!existing) throw new NotFoundException('La notificación no existe');

    if (existing.isRead) {
      return NotificationResponseDto.fromEntity(existing);
    }

    const updated = await this.notifications.markAsRead(id);
    return NotificationResponseDto.fromEntity(updated);
  }
}
