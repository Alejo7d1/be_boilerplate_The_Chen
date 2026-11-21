import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_STRENGTH_MARKS = 20;
export const MAX_STRENGTH_MARK_LENGTH = 100;

export class CreateProgressDto {
  @ApiProperty({
    example: '2026-11-20',
    description: 'Fecha del registro (YYYY-MM-DD). No puede ser futura.',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date!: string;

  @ApiProperty({ example: 78.5, minimum: 20, maximum: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(500)
  weight!: number;

  @ApiProperty({ example: 84, minimum: 30, maximum: 300 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(30)
  @Max(300)
  waist!: number;

  @ApiProperty({ example: 102, minimum: 30, maximum: 300 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(30)
  @Max(300)
  chest!: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Press banca 80 kg'],
    description:
      'Marcas de fuerza en texto libre. Se acepta `"<ejercicio> <peso> kg"` y, opcionalmente, `" x <repeticiones>"`.',
    maxItems: MAX_STRENGTH_MARKS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STRENGTH_MARKS)
  @IsString({ each: true })
  @MaxLength(MAX_STRENGTH_MARK_LENGTH, { each: true })
  strengthMarks?: string[];
}

export class CreateProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  progressId!: string;

  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: '2026-11-20' })
  date!: string;
}

export class ProgressRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  progressId!: string;

  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: '2026-11-20' })
  date!: string;

  @ApiProperty({ example: 78.5 })
  weight!: number;

  @ApiProperty({ example: 84 })
  waist!: number;

  @ApiProperty({ example: 102 })
  chest!: number;

  @ApiProperty({ type: [String], example: ['Press banca 80 kg x 8'] })
  strengthMarks!: string[];
}

export class ProgressListResponseDto {
  @ApiProperty({ type: [ProgressRecordResponseDto] })
  data!: ProgressRecordResponseDto[];
}
