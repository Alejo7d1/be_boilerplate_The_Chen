import { ApiProperty } from '@nestjs/swagger';
import type { ReservationStatus } from '@PrismaClient';

export interface ReservationView {
  id: string;
  classId: string;
  name: string;
  startsAt: Date;
  status: ReservationStatus;
  cancelledAt: Date | null;
}

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function localTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export class ReservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ example: 'Yoga' })
  name!: string;

  @ApiProperty({ example: '2026-11-20' })
  date!: string;

  @ApiProperty({ example: '18:00' })
  startTime!: string;

  @ApiProperty({ enum: ['Activa', 'Cancelada'] })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  static fromEntity(view: ReservationView): ReservationResponseDto {
    return {
      id: view.id,
      classId: view.classId,
      name: view.name,
      date: localDate(view.startsAt),
      startTime: localTime(view.startsAt),
      status: view.status,
      cancelledAt: view.cancelledAt?.toISOString() ?? null,
    };
  }
}
