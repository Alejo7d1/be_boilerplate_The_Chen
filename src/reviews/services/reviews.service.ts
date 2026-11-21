import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { endOfDay, startOfDay } from '@Common/domain';
import { isMembershipActive } from '@Memberships/domain';
import { MembershipRepository } from '@Memberships/repositories';
import { Prisma, ReviewTargetType } from '@PrismaClient';
import {
  ClassAnalyticsResponseDto,
  CreateReviewResponseDto,
  ReviewAnalyticsResponseDto,
  TrainerAnalyticsResponseDto,
  type CreateReviewDto,
  type ReviewAnalyticsQueryDto,
} from '../dto/index.js';
import { ReviewRepository } from '../repositories/index.js';

/** Regla H16: se califica dentro de los 7 días posteriores a la clase. */
const RATING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

interface ReviewTarget {
  targetType: ReviewTargetType;
  trainerId: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async create(
    dto: CreateReviewDto,
    memberId: string,
  ): Promise<CreateReviewResponseDto> {
    const membership = await this.memberships.findLatestByUser(memberId);
    if (!isMembershipActive(membership)) {
      throw new ForbiddenException('Tu membresía está vencida');
    }

    const target = await this.resolveTarget(dto.sessionId, memberId);

    try {
      const review = await this.reviews.create({
        sessionId: dto.sessionId,
        targetType: target.targetType,
        memberId,
        trainerId: target.trainerId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      });

      return {
        reviewId: review.id,
        sessionId: review.sessionId,
        rating: review.rating,
        createdAt: review.createdAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Ya calificaste esta sesión');
      }
      throw error;
    }
  }

  async analytics(
    query: ReviewAnalyticsQueryDto,
  ): Promise<ReviewAnalyticsResponseDto> {
    const from = startOfDay(query.startDate);
    const to = endOfDay(query.endDate);
    if (from > to) {
      throw new BadRequestException(
        'startDate no puede ser posterior a endDate',
      );
    }

    const { byTrainer, byClass } = await this.reviews.analytics({
      from,
      to,
      trainerId: query.trainerId,
      classId: query.classId,
    });

    const [trainers, classes] = await Promise.all([
      this.reviews.findTrainerNames(byTrainer.map((row) => row.trainerId)),
      this.reviews.findClassNames(byClass.map((row) => row.classId)),
    ]);
    const trainerNames = new Map(
      trainers.map((row) => [row.id, row.name || row.email]),
    );
    const classNames = new Map(classes.map((row) => [row.id, row.name]));

    return {
      byTrainer: this.sort(
        byTrainer.map<TrainerAnalyticsResponseDto>((row) => ({
          trainerId: row.trainerId,
          trainerName: trainerNames.get(row.trainerId) ?? '',
          average: this.round(row.average),
          totalReviews: row.totalReviews,
        })),
      ),
      byClass: this.sort(
        byClass.map<ClassAnalyticsResponseDto>((row) => ({
          classId: row.classId,
          className: classNames.get(row.classId) ?? '',
          average: this.round(row.average),
          totalReviews: row.totalReviews,
        })),
      ),
    };
  }

  /**
   * La sesión puede ser una clase o una sesión personal: el ID es polimórfico
   * y se resuelve contra ambas tablas.
   */
  private async resolveTarget(
    sessionId: string,
    memberId: string,
  ): Promise<ReviewTarget> {
    const session = await this.reviews.findClassSession(sessionId);
    if (session) {
      if (session.status === 'Cancelada') {
        throw new ConflictException('La clase fue cancelada');
      }
      const endsAt = new Date(
        session.startsAt.getTime() + session.durationMin * 60_000,
      );
      this.assertRatingWindow(endsAt, session.status === 'Finalizada');
      return {
        targetType: ReviewTargetType.CLASE,
        trainerId: session.trainerId,
      };
    }

    const personal = await this.reviews.findPersonalSession(sessionId);
    // Una sesión personal ajena responde 404 igual que una inexistente.
    if (!personal || personal.memberId !== memberId) {
      throw new NotFoundException('La sesión no existe');
    }
    if (personal.status === 'Cancelada') {
      throw new ConflictException('La sesión fue cancelada');
    }

    // El agendamiento no se marca como completado automáticamente, así que la
    // fecha del bloque es la que decide si la sesión ya ocurrió.
    this.assertRatingWindow(
      this.slotEndsAt(personal.slot),
      personal.status === 'Completada',
    );
    return {
      targetType: ReviewTargetType.SESION_PERSONAL,
      trainerId: personal.slot.trainerId,
    };
  }

  private assertRatingWindow(endsAt: Date, finished: boolean): void {
    const now = Date.now();
    if (!finished && endsAt.getTime() > now) {
      throw new ConflictException('La clase aún no finalizó');
    }
    if (now - endsAt.getTime() > RATING_WINDOW_MS) {
      throw new ConflictException(
        'Solo puedes calificar clases de los últimos 7 días',
      );
    }
  }

  private slotEndsAt(slot: { date: Date; startTime: string }): Date {
    const [hours = 0, minutes = 0] = slot.startTime.split(':').map(Number);
    return new Date(
      slot.date.getTime() + (hours * 60 + minutes + 60) * 60_000,
    );
  }

  private round(value: number | null): number | null {
    return value === null ? null : Math.round(value * 100) / 100;
  }

  private sort<T extends { average: number | null; totalReviews: number }>(
    rows: T[],
  ): T[] {
    return rows.sort(
      (a, b) =>
        (b.average ?? -1) - (a.average ?? -1) ||
        b.totalReviews - a.totalReviews,
    );
  }
}
