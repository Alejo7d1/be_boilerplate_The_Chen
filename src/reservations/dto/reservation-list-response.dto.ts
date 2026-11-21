import { ApiProperty } from '@nestjs/swagger';
import { ReservationResponseDto } from './reservation-response.dto.js';

export class ReservationListResponseDto {
  @ApiProperty({ type: [ReservationResponseDto] })
  data!: ReservationResponseDto[];
}
