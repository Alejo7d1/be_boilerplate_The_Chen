import { ApiProperty } from '@nestjs/swagger';
import type { Plan } from '@PrismaClient';

export class PlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Mensual' })
  name!: string;

  @ApiProperty({ enum: ['MENSUAL', 'TRIMESTRAL', 'CLASES_SUELTAS'] })
  type!: string;

  @ApiProperty({ example: 35 })
  price!: number;

  @ApiProperty({ example: 30, nullable: true, type: Number })
  durationDays!: number | null;

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
      durationDays: plan.durationDays,
      classCount: plan.classCount,
      benefits: plan.benefits,
      active: plan.isActive,
    };
  }
}
