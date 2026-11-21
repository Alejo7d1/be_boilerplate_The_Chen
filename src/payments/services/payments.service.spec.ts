import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { ChargeAlreadyPaidError, ChargeNotFoundError } from '../errors/index.js';
import { PaymentsService } from './payments.service.js';

const DTO = {
  chargeId: 'chg-1',
  cardNumber: '4111111111111111',
  expMonth: 12,
  expYear: 2027,
  cvv: '123',
};

function buildService() {
  const payments = { process: vi.fn() };
  return { service: new PaymentsService(payments as never), payments };
}

describe('PaymentsService', () => {
  it('devuelve el comprobante con los últimos 4 dígitos', async () => {
    const { service, payments } = buildService();
    payments.process.mockResolvedValue({
      charge: {
        concept: 'Renovación mensual',
        amount: 150,
        plan: null,
      },
      payment: {
        receiptNumber: 'REC-00042',
        amount: 150,
        last4: '1111',
        createdAt: new Date('2026-11-20T15:30:00.000Z'),
      },
    });

    const result = await service.process(DTO, 'usr-9');

    expect(result).toEqual({
      receiptNumber: 'REC-00042',
      amount: 150,
      paidAt: '2026-11-20T15:30:00.000Z',
      concept: 'Renovación mensual',
      last4: '1111',
      status: 'PAGADO',
    });
    expect(payments.process).toHaveBeenCalledWith(
      expect.objectContaining({ chargeId: 'chg-1', memberId: 'usr-9', last4: '1111' }),
    );
  });

  it('responde 404 si el cobro no existe o es de otro miembro', async () => {
    const { service, payments } = buildService();
    payments.process.mockRejectedValue(new ChargeNotFoundError('chg-1'));

    await expect(service.process(DTO, 'usr-9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('responde 409 si el cobro ya fue pagado', async () => {
    const { service, payments } = buildService();
    payments.process.mockRejectedValue(new ChargeAlreadyPaidError('chg-1'));

    await expect(service.process(DTO, 'usr-9')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
