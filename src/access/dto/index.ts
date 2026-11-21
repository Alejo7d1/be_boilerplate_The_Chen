import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * H9: el miembro se identifica por carné exacto o por nombre completo. La UI
 * manda siempre el carné; el nombre queda como alternativa para recepción.
 */
export class CheckInDto {
  @ApiPropertyOptional({
    example: 'MEM-2026-0009',
    description: 'Carné exacto del miembro.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cardNumber?: string;

  @ApiPropertyOptional({
    example: 'Ana López',
    description: 'Nombre completo exacto (alternativa al carné).',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  memberName?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Autoriza el ingreso aunque la membresía esté vencida (el resultado pasa a `Excepcion`).',
  })
  @IsOptional()
  @IsBoolean()
  allowException?: boolean;
}

export class CheckInResponseDto {
  @ApiProperty({ format: 'uuid' })
  accessId!: string;

  @ApiProperty({ example: 'Ana López' })
  memberName!: string;

  @ApiProperty({
    enum: ['Permitido', 'Excepcion'],
    example: 'Permitido',
    description: 'Catálogo exacto que interpreta el frontend.',
  })
  result!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;
}
