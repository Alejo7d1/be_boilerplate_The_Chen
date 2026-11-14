import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class CreateTrainerSlotDto {
  @ApiProperty({
    example: '2026-11-10',
    description: 'Fecha local YYYY-MM-DD.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date!: string;

  @ApiProperty({ example: '10:00', description: 'Hora local HH:mm.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener formato HH:mm',
  })
  startTime!: string;
}
