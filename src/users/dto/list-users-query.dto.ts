import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@PrismaClient';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: UserRole, example: UserRole.MIEMBRO })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Texto libre sobre nombre, correo o carné.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
