import { ApiProperty } from '@nestjs/swagger';

export class PurchaseMembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ format: 'uuid' })
  chargeId!: string;

  @ApiProperty({ example: '2027-01-31' })
  newEndDate!: string;

  @ApiProperty({ example: 'Vigente' })
  status!: string;
}
