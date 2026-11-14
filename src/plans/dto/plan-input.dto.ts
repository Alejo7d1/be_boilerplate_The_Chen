import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '@PrismaClient';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PlanInputDto {
  @ApiProperty({ example: 'Mensual', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 35, minimum: 0.01, maximum: 9999.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999.99)
  price!: number;

  @ApiPropertyOptional({ example: 30, description: 'Días de vigencia.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Clases incluidas en el plan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  classesIncluded?: number;

  @ApiPropertyOptional({ example: 'Acceso a sala y clases' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  benefits?: string;

  @ApiPropertyOptional({
    enum: PlanType,
    description:
      'Si se omite se infiere de la duración y las clases incluidas.',
  })
  @IsOptional()
  @IsEnum(PlanType)
  type?: PlanType;
}
