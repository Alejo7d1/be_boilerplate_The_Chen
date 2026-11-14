import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@PrismaClient';

export class TrainerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ example: 'ENTRENADOR' })
  role!: string;

  @ApiProperty({ example: 'Ana López' })
  name!: string;

  @ApiProperty({ example: 'EMP-2026-0007', nullable: true, type: String })
  cardNumber!: string | null;

  static fromEntity(user: User): TrainerResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name || user.email.split('@')[0],
      cardNumber: user.cardNumber,
    };
  }
}
