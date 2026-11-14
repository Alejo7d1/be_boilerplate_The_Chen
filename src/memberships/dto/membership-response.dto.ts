import { ApiProperty } from '@nestjs/swagger';
import {
  resolveMembershipStatus,
  type MembershipSnapshot,
} from '../domain/index.js';

export class MembershipResponseDto {
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  id!: string | null;

  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  planId!: string | null;

  @ApiProperty({ example: 'Mensual', nullable: true, type: String })
  planName!: string | null;

  @ApiProperty({ enum: ['Vigente', 'Vencida', 'Sin Membresía'] })
  status!: string;

  @ApiProperty({ example: '2026-12-31', nullable: true, type: String })
  endDate!: string | null;

  @ApiProperty({ example: 8, nullable: true, type: Number })
  remainingClasses!: number | null;

  static fromEntity(
    memberId: string,
    membership: MembershipSnapshot | null,
  ): MembershipResponseDto {
    return {
      id: membership?.id ?? null,
      memberId,
      planId: membership?.planId ?? null,
      planName: membership?.planName ?? null,
      status: resolveMembershipStatus(membership),
      endDate: membership?.endDate
        ? membership.endDate.toISOString().slice(0, 10)
        : null,
      remainingClasses: membership?.remainingClasses ?? null,
    };
  }
}
