import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@PrismaClient';

/**
 * Vista acotada del padrón para el rol `ENTRENADOR` (H12): necesita buscar
 * miembros para asignarles una rutina, pero no tiene por qué ver correos.
 */
export class MemberOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana López' })
  name!: string;

  @ApiProperty({ example: 'MEM-2026-0009', nullable: true, type: String })
  cardNumber!: string | null;

  static fromEntity(user: User): MemberOptionResponseDto {
    return {
      id: user.id,
      name: user.name,
      cardNumber: user.cardNumber,
    };
  }
}

export class MemberOptionListResponseDto {
  @ApiProperty({ type: [MemberOptionResponseDto] })
  data!: MemberOptionResponseDto[];
}
