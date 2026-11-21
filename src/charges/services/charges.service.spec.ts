import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { ChargesService } from './charges.service.js';

function buildService(rows: unknown[], total: number) {
  const charges = { findPending: vi.fn().mockResolvedValue({ rows, total }) };
  return { service: new ChargesService(charges as never), charges };
}

const ROW = {
  id: 'chg-1',
  userId: 'usr-9',
  amount: 150,
  concept: null,
  createdAt: new Date('2026-11-01T12:00:00.000Z'),
  user: { id: 'usr-9', name: 'Ana López', email: 'ana@club.com', cardNumber: 'MEM-2026-0009' },
  plan: { name: 'Mensual Full' },
};

describe('ChargesService', () => {
  it('mapea el cobro al contrato del frontend', async () => {
    const { service } = buildService([ROW], 1);

    const result = await service.listPending({ page: 1, limit: 10 });

    expect(result.data[0]).toEqual({
      id: 'chg-1',
      memberId: 'usr-9',
      memberName: 'Ana López',
      cardNumber: 'MEM-2026-0009',
      concept: 'Cobro de plan Mensual Full',
      amount: 150,
      dueDate: '2026-11-01',
      createdAt: '2026-11-01T12:00:00.000Z',
      status: 'PENDIENTE',
    });
    expect(result.totalPages).toBe(1);
  });

  it('calcula la última página de la paginación', async () => {
    const { service, charges } = buildService([], 23);

    const result = await service.listPending({ page: 3, limit: 10 });

    expect(result.totalPages).toBe(3);
    expect(charges.findPending).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 10 }),
    );
  });

  it('rechaza un rango de fechas invertido', async () => {
    const { service } = buildService([], 0);

    await expect(
      service.listPending({
        startDate: '2026-11-30',
        endDate: '2026-11-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
