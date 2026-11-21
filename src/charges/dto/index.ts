import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const CHARGES_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export class ListPendingChargesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página, desde 1.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: CHARGES_PAGE_SIZE,
    description: `Tamaño de página (por defecto ${CHARGES_PAGE_SIZE}).`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Desde esta fecha de emisión (YYYY-MM-DD).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate debe tener formato YYYY-MM-DD',
  })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Hasta esta fecha de emisión (YYYY-MM-DD).',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate debe tener formato YYYY-MM-DD',
  })
  endDate?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por miembro.' })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class PendingChargeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'usr-9' })
  memberId!: string;

  @ApiProperty({ example: 'Ana López' })
  memberName!: string;

  @ApiProperty({ example: 'MEM-2026-0009', nullable: true, type: String })
  cardNumber!: string | null;

  @ApiProperty({ example: 'Renovación mensual' })
  concept!: string;

  @ApiProperty({ example: 150 })
  amount!: number;

  @ApiProperty({
    example: '2026-11-01',
    description:
      'Fecha de vencimiento (YYYY-MM-DD). Hoy coincide con la de emisión: el modelo no separa ambas.',
  })
  dueDate!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: 'PENDIENTE' })
  status!: string;
}

export class PendingChargesResponseDto {
  @ApiProperty({ type: [PendingChargeResponseDto] })
  data!: PendingChargeResponseDto[];

  @ApiProperty({ example: 23 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: CHARGES_PAGE_SIZE })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
