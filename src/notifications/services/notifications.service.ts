import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '@Config';

export interface ClassCancelledNotification {
  type: 'CLASS_CANCELLED';
  classId: string;
  className: string;
  startsAt: string;
  reason: string;
  recipients: { email: string; name: string }[];
}

/**
 * Cliente del Servicio de Notificaciones (Módulo 9).
 *
 * La cancelación de una clase no debe fallar si el servicio externo está caído,
 * así que el envío es fire-and-forget: se registra el error y se continúa.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly url: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.url = configService.get('NOTIFICATIONS_URL', { infer: true });
  }

  async notifyClassCancelled(
    notification: ClassCancelledNotification,
  ): Promise<void> {
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
        signal: AbortSignal.timeout(3_000),
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo notificar la cancelación de la clase ${notification.classId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
