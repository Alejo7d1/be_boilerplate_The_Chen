import { ApiProperty } from '@nestjs/swagger';
import { TrainerResponseDto } from './trainer-response.dto.js';

export class TrainerListResponseDto {
  @ApiProperty({ type: [TrainerResponseDto] })
  data!: TrainerResponseDto[];
}
