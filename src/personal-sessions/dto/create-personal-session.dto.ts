import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePersonalSessionDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-000000000002',
  })
  @IsUUID()
  trainerId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '66666666-6666-4666-8666-000000000001',
  })
  @IsUUID()
  slotId!: string;
}
