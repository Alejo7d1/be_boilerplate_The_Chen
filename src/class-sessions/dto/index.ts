import { ApiProperty } from '@nestjs/swagger';

export class ClassSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() trainerName!: string;
  @ApiProperty() startsAt!: string;
  @ApiProperty() durationMin!: number;
  @ApiProperty() capacity!: number;
  @ApiProperty({ description: 'capacity menos reservas Activas' }) availableSpots!: number;
}

export class ReserveResponseDto {
  @ApiProperty({ format: 'uuid' }) reservationId!: string;
  @ApiProperty({ example: 'Activa' }) status!: string;
  @ApiProperty({ example: 'Reserva confirmada' }) message!: string;
}
