import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MachineStatus } from '@PrismaClient';

export class UpdateMachineStatusDto {
  @ApiProperty({ enum: MachineStatus })
  @IsEnum(MachineStatus)
  status!: MachineStatus;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
