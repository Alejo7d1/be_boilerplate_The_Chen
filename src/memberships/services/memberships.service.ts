import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipResponseDto,
  type PurchaseMembershipDto,
  PurchaseMembershipResponseDto,
} from '../dto/index.js';
import {
  DuplicatePurchaseError,
  InactivePlanError,
  MemberNotFoundError,
  NotAMemberError,
  PlanNotFoundError,
} from '../errors/index.js';
import { MembershipRepository } from '../repositories/index.js';

@Injectable()
export class MembershipsService {
  constructor(private readonly memberships: MembershipRepository) {}

  async findMine(memberId: string): Promise<MembershipResponseDto> {
    const membership = await this.memberships.findLatestByUser(memberId);
    return MembershipResponseDto.fromEntity(memberId, membership);
  }

  async purchase(
    dto: PurchaseMembershipDto,
  ): Promise<PurchaseMembershipResponseDto> {
    try {
      const { membership, charge } = await this.memberships.purchase(
        dto.memberId,
        dto.planId,
      );

      return {
        membershipId: membership.id,
        chargeId: charge.id,
        newEndDate: (membership.endDate as Date).toISOString().slice(0, 10),
        status: 'Vigente',
      };
    } catch (error) {
      if (error instanceof MemberNotFoundError) {
        throw new NotFoundException('El miembro no existe');
      }
      if (error instanceof NotAMemberError) {
        throw new BadRequestException('El usuario indicado no es un miembro');
      }
      if (error instanceof PlanNotFoundError) {
        throw new NotFoundException('El plan no existe');
      }
      if (error instanceof InactivePlanError) {
        throw new BadRequestException('El plan no está activo');
      }
      if (error instanceof DuplicatePurchaseError) {
        throw new ConflictException('La operación ya fue registrada');
      }
      throw error;
    }
  }
}
