import { ApiProperty } from '@nestjs/swagger';

/**
 * El inicio de la clase se guarda como instante (`startsAt`), pero el frontend
 * trabaja con fecha y hora locales por separado: el alta envía `date` +
 * `startTime` y se interpretan en la zona del servidor, así que la lectura
 * deshace el mismo camino.
 */
function toLocalDate(startsAt: Date): string {
  const year = startsAt.getFullYear();
  const month = String(startsAt.getMonth() + 1).padStart(2, '0');
  const day = String(startsAt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTime(startsAt: Date): string {
  const hours = String(startsAt.getHours()).padStart(2, '0');
  const minutes = String(startsAt.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export class ClassSessionResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'Yoga Flow' })
  name!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'ID del entrenador que imparte la clase.',
  })
  trainerId!: string;

  @ApiProperty({ example: 'Ana López' })
  trainerName!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-15T14:00:00.000Z',
  })
  startsAt!: string;

  @ApiProperty({
    example: '2026-11-15',
    description: 'Fecha local (YYYY-MM-DD) de inicio.',
  })
  date!: string;

  @ApiProperty({
    example: '08:00',
    description: 'Hora local (HH:mm) de inicio.',
  })
  startTime!: string;

  @ApiProperty({ example: 60 })
  durationMin!: number;

  @ApiProperty({ example: 60, description: 'Alias de `durationMin`.' })
  durationMinutes!: number;

  @ApiProperty({ example: 20 })
  capacity!: number;

  @ApiProperty({ example: 20, description: 'Alias de `capacity`.' })
  maxCapacity!: number;

  @ApiProperty({ description: 'capacity menos reservas Activas', example: 18 })
  availableSpots!: number;

  @ApiProperty({ description: 'Reservas Activas de la clase', example: 2 })
  reservedCount!: number;

  @ApiProperty({
    enum: ['Programada', 'Cancelada', 'Finalizada'],
    example: 'Programada',
  })
  status!: string;

  static fromRow(row: {
    id: string;
    name: string;
    trainerId: string;
    trainerName: string;
    startsAt: Date;
    durationMin: number;
    capacity: number;
    reservedCount: number;
    status: string;
  }): ClassSessionResponseDto {
    return {
      id: row.id,
      name: row.name,
      trainerId: row.trainerId,
      trainerName: row.trainerName,
      startsAt: row.startsAt.toISOString(),
      date: toLocalDate(row.startsAt),
      startTime: toLocalTime(row.startsAt),
      durationMin: row.durationMin,
      durationMinutes: row.durationMin,
      capacity: row.capacity,
      maxCapacity: row.capacity,
      availableSpots: Math.max(row.capacity - row.reservedCount, 0),
      reservedCount: row.reservedCount,
      status: row.status,
    };
  }
}

export class ReserveResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-000000000001',
  })
  reservationId!: string;

  @ApiProperty({ example: 'Activa' })
  status!: string;

  @ApiProperty({ example: 'Reserva confirmada' })
  message!: string;
}

export * from './class-input.dto.js';
export * from './cancel-class.dto.js';
