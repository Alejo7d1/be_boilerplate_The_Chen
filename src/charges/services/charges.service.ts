import { BadRequestException, Injectable } from '@nestjs/common';
import { endOfDay, startOfDay, toIsoDay } from '@Common/domain';
import {
  CHARGES_PAGE_SIZE,
  PendingChargeResponseDto,
  PendingChargesResponseDto,
  type ListPendingChargesQueryDto,
} from '../dto/index.js';
import {
  ChargeRepository,
  type PendingChargeRow,
} from '../repositories/index.js';

@Injectable()
export class ChargesService {
  constructor(private readonly charges: ChargeRepository) {}

  async listPending(
    query: ListPendingChargesQueryDto,
  ): Promise<PendingChargesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? CHARGES_PAGE_SIZE;
    const startDate = query.startDate ? startOfDay(query.startDate) : undefined;
    const endDate = query.endDate ? endOfDay(query.endDate) : undefined;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'startDate no puede ser posterior a endDate',
      );
    }

    const { rows, total } = await this.charges.findPending({
      page,
      limit,
      startDate,
      endDate,
      memberId: query.memberId,
    });

    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toResponse(row: PendingChargeRow): PendingChargeResponseDto {
    return {
      id: row.id,
      memberId: row.userId ?? '',
      memberName: row.user?.name || row.user?.email || 'Miembro',
      cardNumber: row.user?.cardNumber ?? null,
      concept: row.concept ?? this.conceptFromPlan(row.plan?.name),
      amount: Number(row.amount),
      dueDate: toIsoDay(row.createdAt),
      createdAt: row.createdAt.toISOString(),
      status: 'PENDIENTE',
    };
  }

  private conceptFromPlan(planName?: string): string {
    return planName ? `Cobro de plan ${planName}` : 'Cobro pendiente';
  }
}
