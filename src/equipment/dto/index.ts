import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  EQUIPMENT_STATUSES,
  toEquipmentStatus,
  type EquipmentStatus,
} from '../domain/index.js';
import type { Machine } from '@PrismaClient';

/** Mínimo de caracteres del motivo, igual que valida la UI. */
export const MIN_REASON_LENGTH = 5;
/** Máximo que acepta el formulario del frontend (la columna admite 255). */
export const MAX_REASON_LENGTH = 200;

export class ListEquipmentQueryDto {
  @ApiPropertyOptional({ enum: EQUIPMENT_STATUSES })
  @IsOptional()
  @IsIn(EQUIPMENT_STATUSES)
  status?: EquipmentStatus;
}

export class UpdateEquipmentStatusDto {
  @ApiProperty({ enum: EQUIPMENT_STATUSES, example: 'En Mantenimiento' })
  @IsIn(EQUIPMENT_STATUSES)
  status!: EquipmentStatus;

  @ApiPropertyOptional({
    description:
      'Obligatorio cuando el estado no es `Operativa`; se ignora (queda null) cuando sí lo es.',
    example: 'Cambio de banda de la cinta 3',
    nullable: true,
    maxLength: MAX_REASON_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(MIN_REASON_LENGTH)
  @MaxLength(MAX_REASON_LENGTH)
  reason?: string | null;
}

export class EquipmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cinta de correr 3' })
  name!: string;

  @ApiProperty({
    example: 'Cardio',
    nullable: true,
    type: String,
  })
  category!: string | null;

  @ApiProperty({ enum: EQUIPMENT_STATUSES, example: 'Operativa' })
  status!: EquipmentStatus;

  @ApiProperty({
    example: 'Cambio de banda de la cinta 3',
    nullable: true,
    type: String,
  })
  reason!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  static fromEntity(machine: Machine): EquipmentResponseDto {
    return {
      id: machine.id,
      name: machine.name,
      category: machine.category,
      status: toEquipmentStatus(machine.status),
      reason: machine.reason,
      updatedAt: machine.updatedAt.toISOString(),
    };
  }
}

export class EquipmentListResponseDto {
  @ApiProperty({ type: [EquipmentResponseDto] })
  data!: EquipmentResponseDto[];
}
