import { ApiProperty } from '@nestjs/swagger';

export class PersonalSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ example: 'Agendada' })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  chargeId!: string;
}
