import { BadRequestException, Injectable } from '@nestjs/common';
import { endOfDay, startOfDay, toIsoDay } from '@Common/domain';
import {
  FinancialReportResponseDto,
  OccupancyReportResponseDto,
  type FinancialReportQueryDto,
  type OccupancyReportQueryDto,
} from '../dto/index.js';
import { ReportRepository, type OccupancyRow } from '../repositories/index.js';

interface Range {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportRepository) {}

  /** H20: ocupación por sesión (reservas Activas sobre el cupo). */
  async occupancy(
    query: OccupancyReportQueryDto,
  ): Promise<OccupancyReportResponseDto> {
    const range = this.parseRange(query.startDate, query.endDate);
    const rows = await this.reports.findOccupancy({
      ...range,
      classId: query.classId,
    });

    return { data: rows.map((row) => this.toOccupancyRow(row)) };
  }

  /** H21: ingresos del período y proporción de renovaciones. */
  async financial(
    query: FinancialReportQueryDto,
  ): Promise<FinancialReportResponseDto> {
    const range = this.parseRange(query.startDate, query.endDate);
    const { totalRevenue, paymentCount, renewals } =
      await this.reports.findFinancial(range);

    return {
      period: this.period(query.startDate, query.endDate),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paymentCount,
      renewals,
      renewalRate:
        paymentCount > 0
          ? Math.round((renewals / paymentCount) * 1000) / 10
          : 0,
    };
  }

  private toOccupancyRow(row: OccupancyRow) {
    const rate =
      row.capacity > 0
        ? Math.round((row.reservedCount / row.capacity) * 10_000) / 100
        : 0;

    return {
      id: row.id,
      className: row.name,
      date: toIsoDay(row.startsAt),
      startTime: this.toLocalTime(row.startsAt),
      maxCapacity: row.capacity,
      reservedCount: row.reservedCount,
      availableSpots: Math.max(row.capacity - row.reservedCount, 0),
      occupancyRate: rate,
      occupancyPercentage: rate,
    };
  }

  private toLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private parseRange(startDate: string, endDate: string): Range {
    const from = startOfDay(startDate);
    const to = endOfDay(endDate);
    if (from > to) {
      throw new BadRequestException(
        'startDate no puede ser posterior a endDate',
      );
    }
    return { from, to };
  }

  private period(startDate: string, endDate: string): string {
    const startMonth = startDate.slice(0, 7);
    const endMonth = endDate.slice(0, 7);
    return startMonth === endMonth ? startMonth : `${startMonth} a ${endMonth}`;
  }
}
