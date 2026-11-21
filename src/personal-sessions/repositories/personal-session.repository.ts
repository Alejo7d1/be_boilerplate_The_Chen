import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  MembershipInactiveError,
  SlotAlreadyBookedError,
  SlotNotFoundError,
} from '../errors/index.js';
import { isMembershipActive } from '@Memberships/domain';
import {
  Prisma,
  type Charge,
  type Membership,
  type PersonalSession,
  type Plan,
} from '@PrismaClient';

const SERIALIZATION_ATTEMPTS = 3;
const UNIQUE_VIOLATION = 'P2002';

export interface BookingResult {
  session: PersonalSession;
  charge: Charge;
}

@Injectable()
export class PersonalSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async book(
    memberId: string,
    trainerId: string,
    slotId: string,
  ): Promise<BookingResult> {
    for (let attempt = 1; attempt <= SERIALIZATION_ATTEMPTS; attempt++) {
      try {
        return await this.runBooking(memberId, trainerId, slotId);
      } catch (error) {
        if (
          this.isSerializationConflict(error) &&
          attempt < SERIALIZATION_ATTEMPTS
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new SlotAlreadyBookedError(slotId);
  }

  private runBooking(
    memberId: string,
    trainerId: string,
    slotId: string,
  ): Promise<BookingResult> {
    try {
      return this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slotId}))`;

          const slot = await tx.trainerSlot.findUnique({
            where: { id: slotId },
          });
          if (!slot || slot.trainerId !== trainerId) {
            throw new SlotNotFoundError(slotId);
          }
          if (slot.isBooked) throw new SlotAlreadyBookedError(slotId);

          const membership = await tx.membership.findFirst({
            where: { userId: memberId },
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          });
          if (!membership || !this.isActive(membership)) {
            throw new MembershipInactiveError(memberId);
          }

          const session = await tx.personalSession.create({
            data: { slotId, memberId, status: 'Agendada' },
          });
          await tx.trainerSlot.update({
            where: { id: slotId },
            data: { isBooked: true },
          });

          const amount =
            membership.plan.type === 'CLASES_SUELTAS'
              ? membership.plan.price
              : 0;

          const charge = await tx.charge.create({
            data: {
              personalSessionId: session.id,
              amount,
              status: 'Pendiente',
            },
          });

          if (membership.plan.type === 'CLASES_SUELTAS') {
            await tx.membership.update({
              where: { id: membership.id },
              data: { remainingClasses: { decrement: 1 } },
            });
          }

          return { session, charge };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new SlotAlreadyBookedError(slotId);
      }
      throw error;
    }
  }

  private isActive(membership: Membership & { plan: Plan }): boolean {
    return isMembershipActive({
      id: membership.id,
      planId: membership.planId,
      planName: membership.plan.name,
      planType: membership.plan.type,
      startDate: membership.startDate,
      endDate: membership.endDate,
      remainingClasses: membership.remainingClasses,
    });
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
