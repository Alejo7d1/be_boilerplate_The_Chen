import { ApiProperty } from '@nestjs/swagger';
import type { TrainerSlot } from '@PrismaClient';

export class TrainerSlotResponseDto {
  @ApiProperty({ format: 'uuid' })
  slotId!: string;

  @ApiProperty({ example: '2026-11-10' })
  date!: string;

  @ApiProperty({ example: '10:00' })
  startTime!: string;

  @ApiProperty({ example: '11:00' })
  endTime!: string;

  @ApiProperty({ example: false })
  isBooked!: boolean;

  static fromEntity(slot: TrainerSlot): TrainerSlotResponseDto {
    return {
      slotId: slot.id,
      date: slot.date.toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: slot.isBooked,
    };
  }
}
