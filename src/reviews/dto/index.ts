import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_REVIEW_COMMENT_LENGTH = 300;

export class CreateReviewDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID de la clase o de la sesión personal calificada.',
  })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Excelente clase', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_REVIEW_COMMENT_LENGTH)
  comment?: string;
}

export class CreateReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  reviewId!: string;

  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class ReviewAnalyticsQueryDto {
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
  trainerId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Solo aplica a reseñas de clases.',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class TrainerAnalyticsResponseDto {
  @ApiProperty({ format: 'uuid' })
  trainerId!: string;

  @ApiProperty({ example: 'Carlos Mendoza' })
  trainerName!: string;

  @ApiProperty({
    example: 4.25,
    nullable: true,
    type: Number,
    description: '`null` cuando el entrenador no tiene reseñas en el rango.',
  })
  average!: number | null;

  @ApiProperty({ example: 8 })
  totalReviews!: number;
}

export class ClassAnalyticsResponseDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ example: 'Yoga Flow' })
  className!: string;

  @ApiProperty({ example: 5, nullable: true, type: Number })
  average!: number | null;

  @ApiProperty({ example: 2 })
  totalReviews!: number;
}

export class ReviewAnalyticsResponseDto {
  @ApiProperty({ type: [TrainerAnalyticsResponseDto] })
  byTrainer!: TrainerAnalyticsResponseDto[];

  @ApiProperty({ type: [ClassAnalyticsResponseDto] })
  byClass!: ClassAnalyticsResponseDto[];
}
