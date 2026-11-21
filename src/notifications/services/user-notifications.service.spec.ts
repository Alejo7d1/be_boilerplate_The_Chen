import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationSource, UserRole } from '@PrismaClient';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { vi } from 'vitest';
import { SendNotificationDto } from '../dto/index.js';
import { UserNotificationsService } from './user-notifications.service.js';

const ADMIN = { id: 'usr-admin', role: UserRole.RECEPCION_ADMIN } as never;
const TRAINER = { id: 'usr-trainer', role: UserRole.ENTRENADOR } as never;

const DTO: SendNotificationDto = {
  recipientIds: ['usr-1'],
  title: '  Membresía por vencer  ',
  message: '  Tu membresía vence en 3 días.  ',
  sourceModule: NotificationSource.MEMBRESIA,
};

function buildService() {
  const notifications = {
    findActiveUsers: vi
      .fn()
      .mockImplementation((ids: string[]) =>
        Promise.resolve(ids.map((id) => ({ id, name: id, email: `${id}@x.com` }))),
      ),
    findTrainerMemberIds: vi.fn().mockResolvedValue(new Set<string>()),
    createMany: vi
      .fn()
      .mockImplementation((rows: { recipientId: string }[]) =>
        Promise.resolve(rows.map((row, i) => ({ id: `ntf-${i + 1}`, ...row }))),
      ),
  };

  return {
    service: new UserNotificationsService(notifications as never),
    notifications,
  };
}

describe('SendNotificationDto', () => {
  const valid = {
    recipientIds: ['9f0f5f8e-1f0e-4b0e-9c3f-1a2b3c4d5e6f'],
    title: 'Aviso',
    message: 'Cuerpo',
    sourceModule: NotificationSource.CLASES,
  };

  it('acepta un cuerpo válido y recorta el texto', async () => {
    const dto = plainToInstance(SendNotificationDto, {
      ...valid,
      title: '  Aviso  ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.title).toBe('Aviso');
  });

  it('rechaza un título en blanco', async () => {
    const dto = plainToInstance(SendNotificationDto, {
      ...valid,
      title: '   ',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rechaza más de 50 destinatarios', async () => {
    const recipientIds = Array.from(
      { length: 51 },
      (_, i) => `9f0f5f8e-1f0e-4b0e-9c3f-1a2b3c4d5e${String(i).padStart(2, '0')}`,
    );
    const dto = plainToInstance(SendNotificationDto, { ...valid, recipientIds });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});

describe('UserNotificationsService.send', () => {
  it('crea una notificación por destinatario y recorta espacios', async () => {
    const { service, notifications } = buildService();

    const result = await service.send(DTO, ADMIN);

    expect(result).toEqual({ sent: 1, notificationIds: ['ntf-1'] });
    expect(notifications.createMany).toHaveBeenCalledWith([
      {
        recipientId: 'usr-1',
        title: 'Membresía por vencer',
        message: 'Tu membresía vence en 3 días.',
        sourceModule: NotificationSource.MEMBRESIA,
        referenceId: null,
      },
    ]);
  });

  it('deduplica destinatarios repetidos', async () => {
    const { service, notifications } = buildService();

    const result = await service.send(
      {
        recipientIds: ['usr-1', 'usr-1'],
        title: DTO.title,
        message: DTO.message,
        sourceModule: DTO.sourceModule,
      },
      ADMIN,
    );

    expect(result.sent).toBe(1);
    expect(notifications.findActiveUsers).toHaveBeenCalledWith(['usr-1']);
  });

  it('recepción no consulta el alcance de entrenador', async () => {
    const { service, notifications } = buildService();

    await service.send(DTO, ADMIN);

    expect(notifications.findTrainerMemberIds).not.toHaveBeenCalled();
  });

  it('un entrenador no puede notificar fuera de sus miembros', async () => {
    const { service, notifications } = buildService();
    notifications.findTrainerMemberIds.mockResolvedValue(new Set(['usr-otro']));

    await expect(service.send(DTO, TRAINER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('un entrenador puede notificar a un miembro con vínculo', async () => {
    const { service, notifications } = buildService();
    notifications.findTrainerMemberIds.mockResolvedValue(new Set(['usr-1']));

    const result = await service.send(DTO, TRAINER);

    expect(result.sent).toBe(1);
  });

  it('responde 404 si algún destinatario no existe o está inactivo', async () => {
    const { service, notifications } = buildService();
    notifications.findActiveUsers.mockResolvedValue([]);

    await expect(service.send(DTO, ADMIN)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('UserNotificationsService.notifyClassCancelled', () => {
  it('guarda el aviso con el módulo CLASES y la clase como referencia', async () => {
    const { service, notifications } = buildService();

    await service.notifyClassCancelled({
      classId: 'class-1',
      className: 'Yoga Flow',
      startsAt: new Date(2026, 10, 25, 18, 0, 0),
      reason: 'Falta de entrenador',
      recipients: [{ id: 'usr-1' }, { id: 'usr-2' }, { id: 'usr-1' }],
    });

    const [rows] = notifications.createMany.mock.calls[0] as [
      { recipientId: string; title: string; message: string; sourceModule: string; referenceId: string }[],
    ];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      recipientId: 'usr-1',
      title: 'Clase cancelada',
      sourceModule: NotificationSource.CLASES,
      referenceId: 'class-1',
    });
    expect(rows[0]!.message).toContain('Yoga Flow');
    expect(rows[0]!.message).toContain('25/11/2026');
    expect(rows[0]!.message).toContain('18:00');
    expect(rows[0]!.message).toContain('Falta de entrenador');
  });

  it('no falla la cancelación si la escritura falla', async () => {
    const { service, notifications } = buildService();
    notifications.createMany.mockRejectedValue(new Error('DB caída'));

    await expect(
      service.notifyClassCancelled({
        classId: 'class-1',
        className: 'Yoga Flow',
        startsAt: new Date(),
        reason: 'x',
        recipients: [{ id: 'usr-1' }],
      }),
    ).resolves.toBeUndefined();
  });

  it('no escribe nada si no hubo reservas activas', async () => {
    const { service, notifications } = buildService();

    await service.notifyClassCancelled({
      classId: 'class-1',
      className: 'Yoga Flow',
      startsAt: new Date(),
      reason: 'x',
      recipients: [],
    });

    expect(notifications.createMany).not.toHaveBeenCalled();
  });
});
