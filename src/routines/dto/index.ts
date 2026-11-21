import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Mismo límite que la columna `exercises.name`. */
export const EXERCISE_NAME_MAX_LENGTH = 100;
export const MAX_EXERCISES = 30;

export class RoutineExerciseDto {
  @ApiProperty({ example: 'Press banca', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(EXERCISE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  series!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  reps!: number;
}

export class CreateRoutineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ type: [RoutineExerciseDto], minItems: 1, maxItems: 30 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_EXERCISES)
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises!: RoutineExerciseDto[];
}

export class RoutineResponseDto {
  @ApiProperty({ format: 'uuid' })
  routineId!: string;

  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
