import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelClassDto {
  @ApiProperty({ example: 'Falta de entrenador' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason!: string;
}
