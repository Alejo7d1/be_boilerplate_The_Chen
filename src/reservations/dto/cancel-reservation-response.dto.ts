import { ApiProperty } from '@nestjs/swagger';

export class CancelReservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  reservationId!: string;

  @ApiProperty({ example: 'Cancelada' })
  status!: string;

  @ApiProperty({ example: 'Reserva cancelada exitosamente' })
  message!: string;
}
