import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@PrismaClient';

/**
 * Forma pública de un usuario.
 *
 * Los controladores devuelven esto y nunca la fila cruda de Prisma, para que
 * `passwordHash` no pueda filtrarse en una respuesta por descuido.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'nestor@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Ana López' })
  name!: string;

  @ApiProperty({ enum: ['MIEMBRO', 'ENTRENADOR', 'RECEPCION_ADMIN'] })
  role!: string;

  @ApiProperty({ example: 'MEM-2026-0042', nullable: true, type: String })
  cardNumber!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      cardNumber: user.cardNumber,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
