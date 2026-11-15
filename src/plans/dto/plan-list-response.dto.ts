import { ApiProperty } from '@nestjs/swagger';
import { PlanResponseDto } from './plan-response.dto.js';

export class PlanListResponseDto {
  @ApiProperty({ type: [PlanResponseDto] })
  data!: PlanResponseDto[];
}
