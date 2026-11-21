import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class OccupancyReportQueryDto {
  @ApiProperty({ example: '2026-11-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate debe tener formato YYYY-MM-DD',
  })
  startDate!: string;

  @ApiProperty({ example: '2026-11-30' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate debe tener formato YYYY-MM-DD',
  })
  endDate!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class FinancialReportQueryDto {
  @ApiProperty({ example: '2026-11-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate debe tener formato YYYY-MM-DD',
  })
  startDate!: string;

  @ApiProperty({ example: '2026-11-30' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate debe tener formato YYYY-MM-DD',
  })
  endDate!: string;
}

export class OccupancyRowResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Yoga Flow' })
  className!: string;

  @ApiProperty({ example: '2026-11-25' })
  date!: string;

  @ApiProperty({ example: '18:00' })
  startTime!: string;

  @ApiProperty({ example: 20 })
  maxCapacity!: number;

  @ApiProperty({ example: 14 })
  reservedCount!: number;

  @ApiProperty({ example: 6 })
  availableSpots!: number;

  @ApiProperty({ example: 70 })
  occupancyRate!: number;

  @ApiProperty({ example: 70, description: 'Alias de `occupancyRate`.' })
  occupancyPercentage!: number;
}

export class OccupancyReportResponseDto {
  @ApiProperty({ type: [OccupancyRowResponseDto] })
  data!: OccupancyRowResponseDto[];
}

export class FinancialReportResponseDto {
  @ApiProperty({
    example: '2026-11',
    description:
      'Mes del rango cuando empieza y termina en el mismo mes; si no, `YYYY-MM a YYYY-MM`.',
  })
  period!: string;

  @ApiProperty({ example: 2450 })
  totalRevenue!: number;

  @ApiProperty({ example: 18 })
  paymentCount!: number;

  @ApiProperty({ example: 8 })
  renewals!: number;

  @ApiProperty({ example: 44.4 })
  renewalRate!: number;
}
