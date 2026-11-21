import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationSource, UserRole, type User } from '@PrismaClient';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  NOTIFICATIONS_PAGE_SIZE,
  SendNotificationResponseDto,
  type SendNotificationDto,
} from '../dto/index.js';
import {
  NotificationRepository,
  type NewNotification,
} from '../repositories/index.js';

export interface ClassCancelledNotice {
  classId: string;
  className: string;
  startsAt: Date;
  reason: string;
  recipients: { id: string }[];
}

/**
 * Bandeja y despacho de notificaciones (H18/H19, Módulo 9).
 *
 * Es el único punto que escribe en `notifications`: la bandeja del usuario, el
 * envío manual desde recepción y los avisos automáticos del backend (por
 * ejemplo la cancelación de una clase) pasan todos por acá.
 */
@Injectable()
export class UserNotificationsService {
  private readonly logger = new Logger(UserNotificationsService.name);

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

  /**
   * Envío manual: una notificación por destinatario.
   *
   * Un `ENTRENADOR` solo puede escribirle a los miembros con los que tiene
   * vínculo (clase, sesión personal o rutina); recepción puede con cualquiera.
   */
  async send(
    dto: SendNotificationDto,
    requester: User,
  ): Promise<SendNotificationResponseDto> {
    const recipientIds = [...new Set(dto.recipientIds)];

    if (requester.role === UserRole.ENTRENADOR) {
      const allowed = await this.notifications.findTrainerMemberIds(
        requester.id,
      );
      if (recipientIds.some((id) => !allowed.has(id))) {
        throw new ForbiddenException(
          'Solo puedes notificar a los miembros que tienes asignados',
        );
      }
    }

    const users = await this.notifications.findActiveUsers(recipientIds);
    if (users.length !== recipientIds.length) {
      throw new NotFoundException(
        'Alguno de los destinatarios no existe o está inactivo',
      );
    }

    const created = await this.notifications.createMany(
      recipientIds.map<NewNotification>((recipientId) => ({
        recipientId,
        title: dto.title.trim(),
        message: dto.message.trim(),
        sourceModule: dto.sourceModule,
        referenceId: dto.referenceId ?? null,
      })),
    );

    return {
      sent: created.length,
      notificationIds: created.map((notification) => notification.id),
    };
  }

  /**
   * Aviso automático de cancelación (H6/Módulo 9).
   *
   * Corre después de confirmada la cancelación y nunca la hace fallar: si la
   * escritura falla se registra el error y se sigue.
   */
  async notifyClassCancelled(notice: ClassCancelledNotice): Promise<void> {
    const recipients = [...new Set(notice.recipients.map((r) => r.id))];
    if (recipients.length === 0) return;

    const rows: NewNotification[] = recipients.map((recipientId) => ({
      recipientId,
      title: 'Clase cancelada',
      message: `La clase ${notice.className} del ${this.formatDate(
        notice.startsAt,
      )} a las ${this.formatTime(notice.startsAt)} fue cancelada: ${notice.reason}`,
      sourceModule: NotificationSource.CLASES,
      referenceId: notice.classId,
    }));

    try {
      await this.notifications.createMany(rows);
    } catch (error) {
      this.logger.warn(
        `No se pudieron guardar las notificaciones de la clase ${notice.classId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
