import { ApiProperty } from '@nestjs/swagger';
import type { Plan } from '@PrismaClient';

/**
 * Vigencia que se informa para los planes sin `durationDays` (paquetes de
 * clases sueltas). Es la misma que aplica la compra de membresía, así que el
 * cliente ve la fecha de vencimiento real del plan.
 */
const DEFAULT_DURATION_DAYS = 30;

export class PlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mensual' })
  name!: string;

  @ApiProperty({ enum: ['MENSUAL', 'TRIMESTRAL', 'CLASES_SUELTAS'] })
  type!: string;

  @ApiProperty({ example: 35 })
  price!: number;

  @ApiProperty({
    description:
      'Vigencia en días. Nunca es null: los planes sin duración propia informan la vigencia por defecto de 30 días.',
    example: 30,
  })
  durationDays!: number;

  @ApiProperty({ example: 12, nullable: true, type: Number })
  classCount!: number | null;

  @ApiProperty({
    example: 'Acceso a sala y clases',
    nullable: true,
    type: String,
  })
  benefits!: string | null;

  @ApiProperty({ example: true })
  active!: boolean;

  static fromEntity(plan: Plan): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      type: plan.type,
      price: Number(plan.price),
      durationDays: plan.durationDays ?? DEFAULT_DURATION_DAYS,
      classCount: plan.classCount,
      benefits: plan.benefits,
      active: plan.isActive,
    };
  }
}
