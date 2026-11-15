import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PurchaseMembershipDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-000000000004',
  })
  @IsUUID()
  memberId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-4222-8222-000000000001',
  })
  @IsUUID()
  planId!: string;
}
