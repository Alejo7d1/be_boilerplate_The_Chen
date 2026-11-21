import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewTargetType } from '@PrismaClient';
import { vi } from 'vitest';
import { ReviewsService } from './reviews.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MEMBER_ID = 'usr-9';
const TRAINER_ID = 'usr-trainer';

function buildService() {
  const reviews = {
    findClassSession: vi.fn().mockResolvedValue(null),
    findPersonalSession: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((input: { sessionId: string; rating: number }) =>
      Promise.resolve({
        id: 'review-1',
        sessionId: input.sessionId,
        rating: input.rating,
        createdAt: new Date('2026-11-20T17:43:15.049Z'),
      }),
    ),
    analytics: vi.fn().mockResolvedValue({ byTrainer: [], byClass: [] }),
    findTrainerNames: vi.fn().mockResolvedValue([]),
    findClassNames: vi.fn().mockResolvedValue([]),
  };
  const memberships = {
    findLatestByUser: vi.fn().mockResolvedValue({
      id: 'mem-1',
      planType: 'MENSUAL',
      endDate: new Date(Date.now() + 5 * DAY_MS),
      remainingClasses: null,
    }),
  };

  return {
    service: new ReviewsService(reviews as never, memberships as never),
    reviews,
    memberships,
  };
}

const FINISHED_CLASS = {
  id: 'class-1',
  trainerId: TRAINER_ID,
  startsAt: new Date(Date.now() - 2 * DAY_MS),
  durationMin: 60,
  status: 'Finalizada',
};

describe('ReviewsService', () => {
  it('exige membresía vigente', async () => {
    const { service, memberships } = buildService();
    memberships.findLatestByUser.mockResolvedValue(null);

    await expect(
      service.create({ sessionId: 'class-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza una clase que todavía no terminó', async () => {
    const { service, reviews } = buildService();
    reviews.findClassSession.mockResolvedValue({
      ...FINISHED_CLASS,
      status: 'Programada',
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      service.create({ sessionId: 'class-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una clase fuera del plazo de 7 días', async () => {
    const { service, reviews } = buildService();
    reviews.findClassSession.mockResolvedValue({
      ...FINISHED_CLASS,
      startsAt: new Date(Date.now() - 30 * DAY_MS),
    });

    await expect(
      service.create({ sessionId: 'class-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una clase cancelada', async () => {
    const { service, reviews } = buildService();
    reviews.findClassSession.mockResolvedValue({
      ...FINISHED_CLASS,
      status: 'Cancelada',
    });

    await expect(
      service.create({ sessionId: 'class-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra la reseña de una clase finalizada', async () => {
    const { service, reviews } = buildService();
    reviews.findClassSession.mockResolvedValue(FINISHED_CLASS);

    const result = await service.create(
      { sessionId: 'class-1', rating: 5, comment: '  Excelente  ' },
      MEMBER_ID,
    );

    expect(result).toEqual({
      reviewId: 'review-1',
      sessionId: 'class-1',
      rating: 5,
      createdAt: '2026-11-20T17:43:15.049Z',
    });
    expect(reviews.create).toHaveBeenCalledWith({
      sessionId: 'class-1',
      targetType: ReviewTargetType.CLASE,
      memberId: MEMBER_ID,
      trainerId: TRAINER_ID,
      rating: 5,
      comment: 'Excelente',
    });
  });

  it('responde 409 cuando el miembro ya calificó la sesión', async () => {
    const { service, reviews } = buildService();
    reviews.findClassSession.mockResolvedValue(FINISHED_CLASS);
    reviews.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.create({ sessionId: 'class-1', rating: 4 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza una sesión personal que todavía no ocurrió', async () => {
    const { service, reviews } = buildService();
    reviews.findPersonalSession.mockResolvedValue({
      id: 'ps-1',
      memberId: MEMBER_ID,
      status: 'Agendada',
      slot: { trainerId: TRAINER_ID, date: new Date(), startTime: '23:00' },
    });

    await expect(
      service.create({ sessionId: 'ps-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('califica una sesión personal ya ocurrida', async () => {
    const { service, reviews } = buildService();
    reviews.findPersonalSession.mockResolvedValue({
      id: 'ps-1',
      memberId: MEMBER_ID,
      status: 'Agendada',
      slot: {
        trainerId: TRAINER_ID,
        date: new Date(Date.now() - 2 * DAY_MS),
        startTime: '10:00',
      },
    });

    await service.create({ sessionId: 'ps-1', rating: 5 }, MEMBER_ID);

    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'SESION_PERSONAL' }),
    );
  });

  it('oculta las sesiones personales de otros miembros', async () => {    const { service, reviews } = buildService();
    reviews.findPersonalSession.mockResolvedValue({
      id: 'ps-1',
      memberId: 'usr-otro',
      status: 'Completada',
      slot: { trainerId: TRAINER_ID, date: new Date(), startTime: '10:00' },
    });

    await expect(
      service.create({ sessionId: 'ps-1', rating: 5 }, MEMBER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('promedia por entrenador y por clase con dos decimales', async () => {
    const { service, reviews } = buildService();
    reviews.analytics.mockResolvedValue({
      byTrainer: [
        { trainerId: TRAINER_ID, average: 4.255, totalReviews: 8 },
        { trainerId: 'usr-2', average: 3, totalReviews: 1 },
      ],
      byClass: [{ classId: 'class-1', average: 5, totalReviews: 2 }],
    });
    reviews.findTrainerNames.mockResolvedValue([
      { id: TRAINER_ID, name: 'Carlos Mendoza', email: 'carlos@club.com' },
      { id: 'usr-2', name: '', email: 'sin-nombre@club.com' },
    ]);
    reviews.findClassNames.mockResolvedValue([
      { id: 'class-1', name: 'Yoga Flow' },
    ]);

    const result = await service.analytics({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });

    expect(result.byTrainer[0]).toEqual({
      trainerId: TRAINER_ID,
      trainerName: 'Carlos Mendoza',
      average: 4.26,
      totalReviews: 8,
    });
    expect(result.byTrainer[1].trainerName).toBe('sin-nombre@club.com');
    expect(result.byClass[0]).toEqual({
      classId: 'class-1',
      className: 'Yoga Flow',
      average: 5,
      totalReviews: 2,
    });
  });
});
