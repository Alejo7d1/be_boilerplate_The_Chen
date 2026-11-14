import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ClassInputDto {
  @ApiProperty({ example: 'Yoga Flow', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  trainerId!: string;

  @ApiProperty({
    example: '2026-11-20',
    description: 'Fecha local YYYY-MM-DD.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date!: string;

  @ApiProperty({ example: '18:00', description: 'Hora local HH:mm.' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener formato HH:mm',
  })
  startTime!: string;

  @ApiProperty({ example: 60, minimum: 15, maximum: 480 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;

  @ApiProperty({ example: 20, minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxCapacity!: number;
}
