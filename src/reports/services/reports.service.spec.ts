import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { ReportsService } from './reports.service.js';

function buildService() {
  const reports = {
    findOccupancy: vi.fn().mockResolvedValue([]),
    findFinancial: vi
      .fn()
      .mockResolvedValue({ totalRevenue: 0, paymentCount: 0, renewals: 0 }),
  };
  return { service: new ReportsService(reports as never), reports };
}

describe('ReportsService', () => {
  it('calcula la tasa de ocupación y los cupos libres', async () => {
    const { service, reports } = buildService();
    reports.findOccupancy.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Yoga Flow',
        startsAt: new Date(2026, 10, 25, 18, 0, 0),
        capacity: 20,
        reservedCount: 14,
      },
      {
        id: 'class-2',
        name: 'Funcional',
        startsAt: new Date(2026, 10, 26, 8, 0, 0),
        capacity: 0,
        reservedCount: 0,
      },
    ]);

    const result = await service.occupancy({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    expect(result.data[0]).toMatchObject({
      className: 'Yoga Flow',
      date: '2026-11-25',
      startTime: '18:00',
      maxCapacity: 20,
      reservedCount: 14,
      availableSpots: 6,
      occupancyRate: 70,
      occupancyPercentage: 70,
    });
    expect(result.data[1].occupancyRate).toBe(0);
  });

  it('calcula la proporción de renovaciones del período', async () => {
    const { service, reports } = buildService();
    reports.findFinancial.mockResolvedValue({
      totalRevenue: 2450,
      paymentCount: 18,
      renewals: 8,
    });

    const result = await service.financial({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    expect(result).toEqual({
      period: '2026-11',
      totalRevenue: 2450,
      paymentCount: 18,
      renewals: 8,
      renewalRate: 44.4,
    });
  });

  it('describe el período cuando cruza meses', async () => {
    const { service } = buildService();

    const result = await service.financial({
      startDate: '2026-10-15',
      endDate: '2026-11-15',
    });

    expect(result.period).toBe('2026-10 a 2026-11');
  });

  it('rechaza un rango invertido', async () => {
    const { service } = buildService();

    await expect(
      service.occupancy({ startDate: '2026-11-30', endDate: '2026-11-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
