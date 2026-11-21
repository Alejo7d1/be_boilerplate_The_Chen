import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma, ReviewTargetType, type Review } from '@PrismaClient';

export interface ClassSessionTarget {
  id: string;
  trainerId: string;
  startsAt: Date;
  durationMin: number;
  status: string;
}

export interface PersonalSessionTarget {
  id: string;
  memberId: string;
  status: string;
  slot: { trainerId: string; date: Date; startTime: string };
}

export interface CreateReviewInput {
  sessionId: string;
  targetType: ReviewTargetType;
  memberId: string;
  trainerId: string;
  rating: number;
  comment: string | null;
}

export interface AnalyticsFilter {
  from: Date;
  to: Date;
  trainerId?: string;
  classId?: string;
}

export interface TrainerAggregate {
  trainerId: string;
  average: number | null;
  totalReviews: number;
}

export interface ClassAggregate {
  classId: string;
  average: number | null;
  totalReviews: number;
}

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  findClassSession(id: string): Promise<ClassSessionTarget | null> {
    return this.prisma.classSession.findUnique({
      where: { id },
      select: {
        id: true,
        trainerId: true,
        startsAt: true,
        durationMin: true,
        status: true,
      },
    });
  }

  findPersonalSession(id: string): Promise<PersonalSessionTarget | null> {
    return this.prisma.personalSession.findUnique({
      where: { id },
      select: {
        id: true,
        memberId: true,
        status: true,
        slot: { select: { trainerId: true, date: true, startTime: true } },
      },
    });
  }

  create(input: CreateReviewInput): Promise<Review> {
    return this.prisma.review.create({
      data: {
        sessionId: input.sessionId,
        targetType: input.targetType,
        memberId: input.memberId,
        trainerId: input.trainerId,
        rating: input.rating,
        comment: input.comment,
      },
    });
  }

  async analytics(filter: AnalyticsFilter): Promise<{
    byTrainer: TrainerAggregate[];
    byClass: ClassAggregate[];
  }> {
    const range = { gte: filter.from, lte: filter.to };
    const where: Prisma.ReviewWhereInput = {
      createdAt: range,
      ...(filter.trainerId ? { trainerId: filter.trainerId } : {}),
      ...(filter.classId ? { sessionId: filter.classId } : {}),
    };

    const [trainers, classes] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['trainerId'],
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.review.groupBy({
        by: ['sessionId'],
        where: { ...where, targetType: ReviewTargetType.CLASE },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      byTrainer: trainers.map((row) => ({
        trainerId: row.trainerId,
        average: row._avg.rating,
        totalReviews: row._count._all,
      })),
      byClass: classes.map((row) => ({
        classId: row.sessionId,
        average: row._avg.rating,
        totalReviews: row._count._all,
      })),
    };
  }

  findTrainerNames(ids: string[]): Promise<{ id: string; name: string; email: string }[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
  }

  findClassNames(ids: string[]): Promise<{ id: string; name: string }[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.classSession.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }
}
