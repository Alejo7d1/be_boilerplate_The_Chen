import { ApiProperty } from '@nestjs/swagger';

export class ClassSessionResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'Yoga Flow' })
  name!: string;

  @ApiProperty({ example: 'Ana López' })
  trainerName!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-15T14:00:00.000Z',
  })
  startsAt!: string;

  @ApiProperty({ example: 60 })
  durationMin!: number;

  @ApiProperty({ example: 20 })
  capacity!: number;

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
      trainerName: row.trainerName,
      startsAt: row.startsAt.toISOString(),
      durationMin: row.durationMin,
      capacity: row.capacity,
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
