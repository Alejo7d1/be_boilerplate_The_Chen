import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { PlanNameTakenError } from '../errors/index.js';
import { Prisma, type Plan, type PlanType } from '@PrismaClient';

export interface PlanData {
  name: string;
  type: PlanType;
  price: number;
  durationDays: number | null;
  classCount: number | null;
  benefits: string | null;
}

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { name } });
  }

  async create(data: PlanData): Promise<Plan> {
    try {
      return await this.prisma.plan.create({ data });
    } catch (error) {
      if (this.isNameConflict(error)) throw new PlanNameTakenError(data.name);
      throw error;
    }
  }

  async update(id: string, data: PlanData): Promise<Plan> {
    try {
      return await this.prisma.plan.update({ where: { id }, data });
    } catch (error) {
      if (this.isNameConflict(error)) throw new PlanNameTakenError(data.name);
      throw error;
    }
  }

  setActive(id: string, isActive: boolean): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data: { isActive } });
  }

  /** Membresías que todavía cubren la fecha de hoy con este plan. */
  countCurrentMemberships(planId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.membership.count({
      where: {
        planId,
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
    });
  }

  private isNameConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    );
  }
}
