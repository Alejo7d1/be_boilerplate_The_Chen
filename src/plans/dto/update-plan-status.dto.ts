import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePlanStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  active!: boolean;
}
