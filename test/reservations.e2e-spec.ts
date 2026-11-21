// BE-4.1 y QA-4.1
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/services/index.js';

const BASE = '/api';
const PASSWORD = 'Demo1234!';

describe('POST /class-sessions/:id/reserve', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string,
    tokenB: string,
    tokenVencido: string,
    tokenSinPlan: string;
  const stamp = Date.now();

  const register = async (email: string) => {
    await request(app.getHttpServer())
      .post(`${BASE}/users`)
      .send({ email, password: PASSWORD });
    const res = await request(app.getHttpServer())
      .post(`${BASE}/auth/login`)
      .send({ email, password: PASSWORD });
    const me = await request(app.getHttpServer())
      .get(`${BASE}/auth/me`)
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    return { token: res.body.accessToken as string, id: me.body.id as string };
  };
  const giveMembership = async (
    userId: string,
    planId: string,
    daysLeft: number,
  ) =>
    prisma.membership.create({
      data: {
        userId,
        planId,
        startDate: new Date(),
        endDate: new Date(Date.now() + daysLeft * 864e5),
      },
    });
  const newClass = async (capacity: number) => {
    const trainer = await prisma.user.findFirstOrThrow();
    return (
      await prisma.classSession.create({
        data: {
          name: 'Test',
          trainerId: trainer.id,
          startsAt: new Date(Date.now() + 864e5),
          durationMin: 60,
          capacity,
        },
      })
    ).id;
  };
  const reserve = (id: string, token = '') =>
    request(app.getHttpServer())
      .post(`${BASE}/class-sessions/${id}/reserve`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const plan = await prisma.plan.create({
      data: {
        name: `Mensual-${stamp}`,
        type: 'MENSUAL',
        price: 30,
        durationDays: 30,
      },
    });
    const a = await register(`a-${stamp}@test.com`);
    const b = await register(`b-${stamp}@test.com`);
    const v = await register(`v-${stamp}@test.com`);
    const s = await register(`s-${stamp}@test.com`);
    tokenA = a.token;
    tokenB = b.token;
    tokenVencido = v.token;
    tokenSinPlan = s.token;
    await giveMembership(a.id, plan.id, 20);
    await giveMembership(b.id, plan.id, 20);
    await giveMembership(v.id, plan.id, -10);
  });

  it('401 sin token', async () => {
    await reserve(await newClass(5)).expect(401);
  });
  it('201 flujo feliz y 409 en doble reserva', async () => {
    const id = await newClass(5);
    const res = await reserve(id, tokenA).expect(201);
    expect(res.body).toMatchObject({
      status: 'Activa',
      message: 'Reserva confirmada',
    });
    await reserve(id, tokenA).expect(409);
  });
  it('403 con membresía vencida o sin membresía', async () => {
    const id = await newClass(5);
    await reserve(id, tokenVencido).expect(403);
    await reserve(id, tokenSinPlan).expect(403);
  });
  it('409 cuando el cupo está agotado', async () => {
    const id = await newClass(1);
    await reserve(id, tokenA).expect(201);
    await reserve(id, tokenB).expect(409);
  });
  it('concurrencia: dos miembros, un cupo → un 201 y un 409, sin sobrecupo', async () => {
    const id = await newClass(1);
    const res = await Promise.all([reserve(id, tokenA), reserve(id, tokenB)]);
    expect(res.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(
      await prisma.reservation.count({
        where: { sessionId: id, status: 'Activa' },
      }),
    ).toBe(1);
  });

  afterAll(() => app.close());
});
