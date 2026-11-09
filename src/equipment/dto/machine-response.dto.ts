import { ApiProperty } from '@nestjs/swagger';
import { MachineStatus } from '@PrismaClient';

export class MachineResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: MachineStatus })
  status!: MachineStatus;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
