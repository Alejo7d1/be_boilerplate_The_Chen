import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { AccessService } from './access.service.js';

const NOW = new Date('2026-11-21T12:00:00.000Z');
const MEMBER = { id: 'usr-1', name: 'Ana López', email: 'ana@club.com' };

function buildService(options: { lastAccess?: { id: string } | null } = {}) {
  const access = {
    findMember: vi.fn().mockResolvedValue(MEMBER),
    findLastAccepted: vi.fn().mockResolvedValue(options.lastAccess ?? null),
    create: vi
      .fn()
      .mockImplementation((memberId: string, result: string) =>
        Promise.resolve({ id: 'acc-1', memberId, result, timestamp: NOW }),
      ),
  };
  const memberships = { findLatestByUser: vi.fn().mockResolvedValue(null) };

  return {
    service: new AccessService(access as never, memberships as never),
    access,
    memberships,
  };
}

describe('AccessService', () => {
  it('exige carné o nombre', async () => {
    const { service } = buildService();
    await expect(service.checkIn({}, 'admin')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('responde 404 cuando el carné no existe', async () => {
    const { service, access } = buildService();
    access.findMember.mockResolvedValue(null);

    await expect(
      service.checkIn({ cardNumber: 'MEM-2026-9999' }, 'admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra el ingreso como Permitido con membresía vigente', async () => {
    const { service, access, memberships } = buildService();
    memberships.findLatestByUser.mockResolvedValue({
      id: 'mem-1',
      planType: 'MENSUAL',
      endDate: new Date(Date.now() + 5 * 86_400_000),
      remainingClasses: null,
    });

    const result = await service.checkIn(
      { cardNumber: 'MEM-2026-0001' },
      'admin',
    );

    expect(result).toMatchObject({
      accessId: 'acc-1',
      memberName: 'Ana López',
      result: 'Permitido',
    });
    expect(access.create).toHaveBeenCalledWith('usr-1', 'Permitido', 'admin');
  });

  it('rechaza una membresía vencida y deja el intento auditado', async () => {
    const { service, access } = buildService();

    await expect(
      service.checkIn({ cardNumber: 'MEM-2026-0001' }, 'admin'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.create).toHaveBeenCalledWith('usr-1', 'Denegado', 'admin');
  });

  it('autoriza por excepción cuando recepción lo pide', async () => {
    const { service } = buildService();

    const result = await service.checkIn(
      { cardNumber: 'MEM-2026-0001', allowException: true },
      'admin',
    );

    expect(result.result).toBe('Excepcion');
  });

  it('bloquea un segundo ingreso dentro de los 5 minutos', async () => {
    const { service } = buildService({ lastAccess: { id: 'acc-0' } });

    await expect(
      service.checkIn({ cardNumber: 'MEM-2026-0001' }, 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
