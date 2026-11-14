import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import {
  DuplicatePurchaseError,
  InactivePlanError,
  MemberNotFoundError,
  NotAMemberError,
  PlanNotFoundError,
} from '../errors/index.js';
import {
  Prisma,
  UserRole,
  type Charge,
  type Membership,
  type Plan,
} from '@PrismaClient';
import type { MembershipSnapshot } from '../domain/index.js';

const DUPLICATE_WINDOW_MS = 5_000;
const SERIALIZATION_ATTEMPTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PurchaseResult {
  membership: Membership;
  charge: Charge;
}

@Injectable()
export class MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestByUser(userId: string): Promise<MembershipSnapshot | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { name: true, type: true } } },
    });

    if (!membership) return null;
    return {
      id: membership.id,
      planId: membership.planId,
      planName: membership.plan.name,
      planType: membership.plan.type,
      startDate: membership.startDate,
      endDate: membership.endDate,
      remainingClasses: membership.remainingClasses,
    };
  }

  /**
   * Compra o renueva en una sola transacción.
   *
   * El advisory lock por miembro serializa dos compras simultáneas del mismo
   * miembro (por ejemplo, un doble clic): la segunda espera, ve el cobro recién
   * creado y responde 409 en vez de extender la vigencia dos veces.
   */
  async purchase(memberId: string, planId: string): Promise<PurchaseResult> {
    for (let attempt = 1; attempt <= SERIALIZATION_ATTEMPTS; attempt++) {
      try {
        return await this.runPurchase(memberId, planId);
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
    throw new Error('No se pudo completar la compra');
  }

  private runPurchase(
    memberId: string,
    planId: string,
  ): Promise<PurchaseResult> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${memberId}))`;

        const member = await tx.user.findUnique({ where: { id: memberId } });
        if (!member) throw new MemberNotFoundError(memberId);
        if (member.role !== UserRole.MIEMBRO)
          throw new NotAMemberError(memberId);

        const plan = await tx.plan.findUnique({ where: { id: planId } });
        if (!plan) throw new PlanNotFoundError(planId);
        if (!plan.isActive) throw new InactivePlanError(planId);

        const latest = await tx.membership.findFirst({
          where: { userId: memberId },
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        });

        if (latest) {
          const recentCharge = await tx.charge.findFirst({
            where: {
              membershipId: latest.id,
              createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
            },
            select: { id: true },
          });
          if (recentCharge) throw new DuplicatePurchaseError(memberId);
        }

        const now = new Date();
        const renewal = latest && this.isCurrent(latest) ? latest : null;
        const base =
          renewal?.endDate && renewal.endDate > now ? renewal.endDate : now;
        const endDate = this.addDays(base, plan.durationDays ?? 30);
        const remainingClasses = this.nextRemainingClasses(renewal, plan);

        const membership = renewal
          ? await tx.membership.update({
              where: { id: renewal.id },
              data: { planId: plan.id, endDate, remainingClasses },
            })
          : await tx.membership.create({
              data: {
                userId: memberId,
                planId: plan.id,
                startDate: now,
                endDate,
                remainingClasses,
              },
            });

        const charge = await tx.charge.create({
          data: {
            membershipId: membership.id,
            amount: plan.price,
            status: 'Pendiente',
          },
        });

        return { membership, charge };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private isCurrent(membership: Membership & { plan: Plan }): boolean {
    if (membership.plan.type === 'CLASES_SUELTAS') {
      return (membership.remainingClasses ?? 0) > 0;
    }
    if (!membership.endDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return membership.endDate >= today;
  }

  private nextRemainingClasses(
    renewal: (Membership & { plan: Plan }) | null,
    plan: Plan,
  ): number | null {
    if (plan.type !== 'CLASES_SUELTAS') return null;

    const carried =
      renewal?.planId === plan.id ? (renewal.remainingClasses ?? 0) : 0;
    return carried + (plan.classCount ?? 0);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
