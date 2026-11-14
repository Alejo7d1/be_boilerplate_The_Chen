import { ApiProperty } from '@nestjs/swagger';
import { TrainerSlotResponseDto } from './trainer-slot-response.dto.js';

export class TrainerSlotListResponseDto {
  @ApiProperty({ type: [TrainerSlotResponseDto] })
  data!: TrainerSlotResponseDto[];
}
