// Pruebas de las subtareas BE pendientes del sprint (H1, H2, H3, H5, H6, H7, H8).
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/services/index.js';

const BASE = '/api';
const PASSWORD = 'Demo1234!';

interface Actor {
  id: string;
  email: string;
  token: string;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Cada corrida usa un día distinto para no chocar con los bloques de
// disponibilidad que deja la corrida anterior en la base de prueba.
const RUN_DAY_OFFSET = 20 + (Date.now() % 300);
const FUTURE_DATE = dateOnly(daysFromNow(RUN_DAY_OFFSET + 1));
const NEXT_DATE = dateOnly(daysFromNow(RUN_DAY_OFFSET));

describe('Backend pendiente del sprint', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let counter = 0;
  const stamp = Date.now();

  let admin: Actor;
  let member: Actor;
  let member2: Actor;
  let member5: Actor;
  let expired: Actor;
  let trainer: Actor;
  let trainer2: Actor;

  const server = () => app.getHttpServer();
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = async (prefix: string, name?: string): Promise<Actor> => {
    const email = `${prefix}-${stamp}-${++counter}@test.com`;
    const created = await request(server())
      .post(`${BASE}/users`)
      .send({ email, password: PASSWORD, ...(name ? { name } : {}) });
    expect(created.status).toBe(201);

    const login = await request(server())
      .post(`${BASE}/auth/login`)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    return { id: created.body.id, email, token: login.body.accessToken };
  };

  const promote = async (actor: Actor, role: string): Promise<void> => {
    await prisma.user.update({
      where: { id: actor.id },
      data: { role: role as never },
    });
  };

  const createPlan = (overrides: Record<string, unknown> = {}) =>
    prisma.plan.create({
      data: {
        name: `Plan-${stamp}-${++counter}`,
        type: 'MENSUAL',
        price: 30,
        durationDays: 30,
        ...overrides,
      },
    });

  const createMembership = async (
    userId: string,
    planId: string,
    options: { days?: number; remainingClasses?: number | null } = {},
  ) =>
    prisma.membership.create({
      data: {
        userId,
        planId,
        startDate: daysFromNow(-5),
        endDate:
          options.days === undefined
            ? daysFromNow(30)
            : daysFromNow(options.days),
        remainingClasses: options.remainingClasses ?? null,
      },
    });

  const createSession = async (
    trainerId: string,
    startsAt: Date,
    capacity = 10,
  ) =>
    prisma.classSession.create({
      data: {
        name: `Clase-${stamp}-${++counter}`,
        trainerId,
        startsAt,
        durationMin: 60,
        capacity,
      },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    admin = await register('admin');
    trainer = await register('trainer', 'Ana López');
    trainer2 = await register('trainer2', 'Carlos Ruiz');
    member = await register('member', 'Miembro Uno');
    member2 = await register('member2', 'Miembro Dos');
    member5 = await register('member5', 'Miembro Cinco');
    expired = await register('expired', 'Miembro Vencido');

    await promote(admin, 'RECEPCION_ADMIN');
    await promote(trainer, 'ENTRENADOR');
    await promote(trainer2, 'ENTRENADOR');

    const expiredPlan = await createPlan({ name: `Vencido-${stamp}` });
    await createMembership(expired.id, expiredPlan.id, { days: -10 });
  });

  describe('BE-2.2 — usuarios y miembros', () => {
    it('el alta asigna MIEMBRO y genera el carné', async () => {
      const email = `alta-${stamp}@test.com`;
      const res = await request(server())
        .post(`${BASE}/users`)
        .send({ email, password: PASSWORD, name: 'Alta Directa' })
        .expect(201);

      expect(res.body).toMatchObject({
        email,
        name: 'Alta Directa',
        role: 'MIEMBRO',
      });
      expect(res.body.cardNumber).toMatch(/^MEM-\d{4}-\d{4}$/);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('el admin lista y busca miembros', async () => {
      const res = await request(server())
        .get(`${BASE}/users`)
        .query({ role: 'MIEMBRO', search: member.email })
        .set(bearer(admin.token))
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: member.id,
            email: member.email,
            role: 'MIEMBRO',
          }),
        ]),
      );
    });

    it('un miembro no puede listar el padrón', async () => {
      await request(server())
        .get(`${BASE}/users`)
        .set(bearer(member.token))
        .expect(403);
    });

    it('sin token responde 401', async () => {
      await request(server()).get(`${BASE}/users`).expect(401);
    });
  });

  describe('BE-3.1 — administración de planes', () => {
    let planId: string;

    it('crea un plan con los campos que consume el FE', async () => {
      const res = await request(server())
        .post(`${BASE}/plans`)
        .set(bearer(admin.token))
        .send({
          name: `Mensual-${stamp}`,
          price: 35,
          durationDays: 30,
          classesIncluded: 12,
          benefits: 'Acceso a sala y clases',
        })
        .expect(201);

      planId = res.body.id;
      expect(res.body).toMatchObject({
        name: `Mensual-${stamp}`,
        type: 'MENSUAL',
        price: 35,
        durationDays: 30,
        classCount: 12,
        benefits: 'Acceso a sala y clases',
        active: true,
      });
    });

    it('solo el admin puede crear planes', async () => {
      await request(server())
        .post(`${BASE}/plans`)
        .set(bearer(member.token))
        .send({ name: `No-${stamp}`, price: 10, durationDays: 30 })
        .expect(403);
    });

    it('el listado está disponible para cualquier autenticado', async () => {
      const res = await request(server())
        .get(`${BASE}/plans`)
        .set(bearer(member.token))
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: planId })]),
      );
    });

    it('edita el plan', async () => {
      const res = await request(server())
        .put(`${BASE}/plans/${planId}`)
        .set(bearer(admin.token))
        .send({
          name: `Mensual-${stamp}-editado`,
          price: 40,
          durationDays: 30,
          classesIncluded: 15,
        })
        .expect(200);

      expect(res.body).toMatchObject({ price: 40, classCount: 15 });
    });

    it('cambia el estado del plan', async () => {
      const res = await request(server())
        .patch(`${BASE}/plans/${planId}/status`)
        .set(bearer(admin.token))
        .send({ active: false })
        .expect(200);

      expect(res.body.active).toBe(false);
    });

    it('no desactiva un plan con membresías vigentes', async () => {
      const plan = await createPlan({ name: `EnUso-${stamp}` });
      await createMembership(member2.id, plan.id, { days: 20 });

      await request(server())
        .patch(`${BASE}/plans/${plan.id}/status`)
        .set(bearer(admin.token))
        .send({ active: false })
        .expect(409);
    });

    it('valida el cuerpo y el plan inexistente', async () => {
      await request(server())
        .post(`${BASE}/plans`)
        .set(bearer(admin.token))
        .send({ name: `Invalido-${stamp}`, price: 0, durationDays: 30 })
        .expect(400);

      await request(server())
        .patch(`${BASE}/plans/${randomUUID()}/status`)
        .set(bearer(admin.token))
        .send({ active: true })
        .expect(404);
    });
  });

  describe('H1 / BE-2.1 — membresías', () => {
    let purchasePlanId: string;

    it('devuelve Sin Membresía sin registro previo', async () => {
      const res = await request(server())
        .get(`${BASE}/memberships/me`)
        .set(bearer(member.token))
        .expect(200);

      expect(res.body).toMatchObject({
        id: null,
        memberId: member.id,
        planId: null,
        planName: null,
        status: 'Sin Membresía',
        endDate: null,
        remainingClasses: null,
      });
    });

    it('registra la compra y luego consulta Vigente', async () => {
      const plan = await createPlan({ name: `Compra-${stamp}` });
      purchasePlanId = plan.id;

      const purchase = await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: member.id, planId: plan.id })
        .expect(201);

      expect(purchase.body).toMatchObject({ status: 'Vigente' });
      expect(purchase.body.membershipId).toBeTruthy();
      expect(purchase.body.chargeId).toBeTruthy();
      expect(purchase.body.newEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const me = await request(server())
        .get(`${BASE}/memberships/me`)
        .set(bearer(member.token))
        .expect(200);

      expect(me.body).toMatchObject({
        id: purchase.body.membershipId,
        planId: plan.id,
        planName: plan.name,
        status: 'Vigente',
      });
    });

    it('rechaza la operación duplicada', async () => {
      await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: member.id, planId: purchasePlanId })
        .expect(409);
    });

    it('solo el admin puede comprar', async () => {
      await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(member.token))
        .send({ memberId: member.id, planId: purchasePlanId })
        .expect(403);
    });

    it('responde 400 con plan inactivo y 404 con plan inexistente', async () => {
      const inactive = await createPlan({
        name: `Inactivo-${stamp}`,
        isActive: false,
      });

      await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: member2.id, planId: inactive.id })
        .expect(400);

      await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: member2.id, planId: randomUUID() })
        .expect(404);
    });

    it('renueva extendiendo la fecha de vencimiento', async () => {
      const plan = await createPlan({
        name: `Renueva-${stamp}`,
        durationDays: 30,
      });
      const currentEnd = daysFromNow(10);
      const membership = await prisma.membership.create({
        data: {
          userId: member5.id,
          planId: plan.id,
          startDate: daysFromNow(-5),
          endDate: currentEnd,
        },
      });

      const res = await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: member5.id, planId: plan.id })
        .expect(201);

      expect(res.body.membershipId).toBe(membership.id);
      expect(res.body.newEndDate).toBe(
        dateOnly(new Date(currentEnd.getTime() + 30 * 864e5)),
      );
    });

    it('acumula clases en un plan por clases', async () => {
      const plan = await createPlan({
        name: `Clases-${stamp}`,
        type: 'CLASES_SUELTAS',
        durationDays: null,
        classCount: 5,
        price: 8,
      });
      const target = await register('clases-plan');

      await request(server())
        .post(`${BASE}/memberships/purchase`)
        .set(bearer(admin.token))
        .send({ memberId: target.id, planId: plan.id })
        .expect(201);

      const me = await request(server())
        .get(`${BASE}/memberships/me`)
        .set(bearer(target.token))
        .expect(200);

      expect(me.body).toMatchObject({ status: 'Vigente', remainingClasses: 5 });
    });
  });

  describe('BE-5.1 — mis reservas y cancelación', () => {
    it('lista las reservas propias y cancela con anticipación', async () => {
      const session = await createSession(trainer.id, daysFromNow(3), 5);
      const reservation = await prisma.reservation.create({
        data: { sessionId: session.id, memberId: member.id },
      });

      const list = await request(server())
        .get(`${BASE}/reservations/me`)
        .set(bearer(member.token))
        .expect(200);

      expect(list.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: reservation.id,
            classId: session.id,
            name: session.name,
            status: 'Activa',
            cancelledAt: null,
          }),
        ]),
      );

      const cancelled = await request(server())
        .delete(`${BASE}/reservations/${reservation.id}`)
        .set(bearer(member.token))
        .expect(200);

      expect(cancelled.body).toMatchObject({
        reservationId: reservation.id,
        status: 'Cancelada',
        message: 'Reserva cancelada exitosamente',
      });

      const row = await prisma.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(row.status).toBe('Cancelada');
      expect(row.cancelledAt).not.toBeNull();

      await request(server())
        .delete(`${BASE}/reservations/${reservation.id}`)
        .set(bearer(member.token))
        .expect(409);
    });

    it('rechaza cancelar con menos de 2 horas', async () => {
      const session = await createSession(trainer.id, daysFromNow(1 / 24), 5);
      const reservation = await prisma.reservation.create({
        data: { sessionId: session.id, memberId: member.id },
      });

      const res = await request(server())
        .delete(`${BASE}/reservations/${reservation.id}`)
        .set(bearer(member.token))
        .expect(400);

      expect(res.body.message).toBe(
        'No es posible cancelar con menos de 2 horas de anticipación',
      );
    });

    it('no permite cancelar reservas ajenas', async () => {
      const session = await createSession(trainer.id, daysFromNow(4), 5);
      const reservation = await prisma.reservation.create({
        data: { sessionId: session.id, memberId: member.id },
      });

      await request(server())
        .delete(`${BASE}/reservations/${reservation.id}`)
        .set(bearer(member2.token))
        .expect(404);
    });

    it('responde 403 si la membresía está vencida', async () => {
      const session = await createSession(trainer.id, daysFromNow(4), 5);
      const reservation = await prisma.reservation.create({
        data: { sessionId: session.id, memberId: expired.id },
      });

      await request(server())
        .delete(`${BASE}/reservations/${reservation.id}`)
        .set(bearer(expired.token))
        .expect(403);
    });
  });

  describe('BE-6.1 — clases administrativas', () => {
    let classId: string;

    it('programa una clase y detecta solapamiento', async () => {
      const created = await request(server())
        .post(`${BASE}/classes`)
        .set(bearer(admin.token))
        .send({
          name: 'Yoga Flow',
          trainerId: trainer2.id,
          date: FUTURE_DATE,
          startTime: '08:00',
          durationMinutes: 60,
          maxCapacity: 10,
        })
        .expect(201);

      classId = created.body.id;
      expect(created.body).toMatchObject({
        name: 'Yoga Flow',
        trainerName: 'Carlos Ruiz',
        status: 'Programada',
        reservedCount: 0,
        availableSpots: 10,
        capacity: 10,
      });

      await request(server())
        .post(`${BASE}/classes`)
        .set(bearer(admin.token))
        .send({
          name: 'Solapada',
          trainerId: trainer2.id,
          date: FUTURE_DATE,
          startTime: '08:30',
          durationMinutes: 60,
          maxCapacity: 10,
        })
        .expect(409);
    });

    it('valida permisos y entrenador inexistente', async () => {
      await request(server())
        .post(`${BASE}/classes`)
        .set(bearer(member.token))
        .send({
          name: 'No permitida',
          trainerId: trainer2.id,
          date: FUTURE_DATE,
          startTime: '14:00',
          durationMinutes: 60,
          maxCapacity: 10,
        })
        .expect(403);

      await request(server())
        .post(`${BASE}/classes`)
        .set(bearer(admin.token))
        .send({
          name: 'Sin entrenador',
          trainerId: randomUUID(),
          date: FUTURE_DATE,
          startTime: '14:00',
          durationMinutes: 60,
          maxCapacity: 10,
        })
        .expect(404);
    });

    it('edita la clase', async () => {
      const res = await request(server())
        .put(`${BASE}/classes/${classId}`)
        .set(bearer(admin.token))
        .send({
          name: 'Yoga Flow editado',
          trainerId: trainer2.id,
          date: FUTURE_DATE,
          startTime: '12:00',
          durationMinutes: 90,
          maxCapacity: 12,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        name: 'Yoga Flow editado',
        durationMin: 90,
        capacity: 12,
      });
    });

    it('cancela la clase y libera sus reservas', async () => {
      const reservation = await prisma.reservation.create({
        data: { sessionId: classId, memberId: member.id },
      });

      const res = await request(server())
        .patch(`${BASE}/classes/${classId}/cancel`)
        .set(bearer(admin.token))
        .send({ reason: 'Falta de entrenador' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'Cancelada', reservedCount: 0 });

      const row = await prisma.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(row.status).toBe('Cancelada');
      expect(row.cancelledAt).not.toBeNull();

      await request(server())
        .patch(`${BASE}/classes/${classId}/cancel`)
        .set(bearer(admin.token))
        .send({ reason: 'Otra vez' })
        .expect(409);
    });

    it('no cancela una clase finalizada', async () => {
      const finished = await prisma.classSession.create({
        data: {
          name: 'Finalizada',
          trainerId: trainer2.id,
          startsAt: daysFromNow(-2),
          durationMin: 60,
          capacity: 10,
          status: 'Finalizada',
        },
      });

      await request(server())
        .patch(`${BASE}/classes/${finished.id}/cancel`)
        .set(bearer(admin.token))
        .send({ reason: 'Tarde' })
        .expect(409);
    });

    it('el listado comparte el DTO con reservedCount y status', async () => {
      await createSession(trainer2.id, daysFromNow(2), 8);
      const res = await request(server())
        .get(`${BASE}/class-sessions`)
        .set(bearer(admin.token))
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          reservedCount: expect.any(Number),
          status: expect.any(String),
          availableSpots: expect.any(Number),
        }),
      );
    });
  });

  describe('BE-7.1 / BE-7.3 — disponibilidad del entrenador', () => {
    let slotId: string;

    it('registra un bloque de 60 minutos', async () => {
      const res = await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: NEXT_DATE, startTime: '10:00' })
        .expect(201);

      slotId = res.body.slotId;
      expect(res.body).toMatchObject({
        date: NEXT_DATE,
        startTime: '10:00',
        endTime: '11:00',
        isBooked: false,
      });
    });

    it('rechaza duplicados y cruces', async () => {
      await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: NEXT_DATE, startTime: '10:00' })
        .expect(409);

      await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: NEXT_DATE, startTime: '10:30' })
        .expect(409);
    });

    it('valida rango, pasado y rol', async () => {
      for (const startTime of ['05:00', '22:00']) {
        await request(server())
          .post(`${BASE}/trainer-availability`)
          .set(bearer(trainer.token))
          .send({ date: NEXT_DATE, startTime })
          .expect(400);
      }

      await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: dateOnly(daysFromNow(-1)), startTime: '10:00' })
        .expect(400);

      await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(member.token))
        .send({ date: NEXT_DATE, startTime: '13:00' })
        .expect(403);
    });

    it('consulta la disponibilidad respetando la propiedad', async () => {
      const res = await request(server())
        .get(`${BASE}/trainers/${trainer.id}/availability`)
        .set(bearer(member.token))
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ slotId })]),
      );

      await request(server())
        .get(`${BASE}/trainers/${trainer.id}/availability`)
        .set(bearer(trainer2.token))
        .expect(403);

      await request(server())
        .get(`${BASE}/trainers/${randomUUID()}/availability`)
        .set(bearer(member.token))
        .expect(404);
    });

    it('elimina un bloque propio y protege los ajenos o reservados', async () => {
      const other = await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer2.token))
        .send({ date: NEXT_DATE, startTime: '15:00' })
        .expect(201);

      await request(server())
        .delete(`${BASE}/trainer-availability/${other.body.slotId}`)
        .set(bearer(trainer.token))
        .expect(404);

      await request(server())
        .delete(`${BASE}/trainer-availability/${slotId}`)
        .set(bearer(trainer.token))
        .expect(204);

      const list = await request(server())
        .get(`${BASE}/trainers/${trainer.id}/availability`)
        .set(bearer(member.token))
        .expect(200);
      expect(
        list.body.data.map((slot: { slotId: string }) => slot.slotId),
      ).not.toContain(slotId);

      const booked = await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: NEXT_DATE, startTime: '14:00' })
        .expect(201);
      await prisma.trainerSlot.update({
        where: { id: booked.body.slotId },
        data: { isBooked: true },
      });

      await request(server())
        .delete(`${BASE}/trainer-availability/${booked.body.slotId}`)
        .set(bearer(trainer.token))
        .expect(409);
    });
  });

  describe('BE-8.1 — entrenadores y sesiones personales', () => {
    const createSlot = async (startTime: string) => {
      const res = await request(server())
        .post(`${BASE}/trainer-availability`)
        .set(bearer(trainer.token))
        .send({ date: NEXT_DATE, startTime })
        .expect(201);
      return res.body.slotId as string;
    };

    it('lista entrenadores con los campos del selector', async () => {
      const res = await request(server())
        .get(`${BASE}/trainers`)
        .set(bearer(member.token))
        .expect(200);

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: trainer.id,
            email: trainer.email,
            role: 'ENTRENADOR',
            name: 'Ana López',
          }),
        ]),
      );
    });

    it('agenda una sesión personal y reserva el bloque', async () => {
      const slotId = await createSlot('16:00');

      const res = await request(server())
        .post(`${BASE}/personal-sessions`)
        .set(bearer(member2.token))
        .send({ trainerId: trainer.id, slotId })
        .expect(201);

      expect(res.body).toMatchObject({ status: 'Agendada' });
      expect(res.body.sessionId).toBeTruthy();
      expect(res.body.chargeId).toBeTruthy();

      const slot = await prisma.trainerSlot.findUniqueOrThrow({
        where: { id: slotId },
      });
      expect(slot.isBooked).toBe(true);

      await request(server())
        .post(`${BASE}/personal-sessions`)
        .set(bearer(member.token))
        .send({ trainerId: trainer.id, slotId })
        .expect(409);
    });

    it('rechaza la sesión si la membresía está vencida', async () => {
      const slotId = await createSlot('17:00');

      await request(server())
        .post(`${BASE}/personal-sessions`)
        .set(bearer(expired.token))
        .send({ trainerId: trainer.id, slotId })
        .expect(403);
    });

    it('descuenta una clase y cobra el precio del plan por clases', async () => {
      const plan = await createPlan({
        name: `SesionClases-${stamp}`,
        type: 'CLASES_SUELTAS',
        durationDays: null,
        classCount: 3,
        price: 9,
      });
      const membership = await createMembership(member5.id, plan.id, {
        remainingClasses: 2,
      });
      const slotId = await createSlot('18:00');

      await request(server())
        .post(`${BASE}/personal-sessions`)
        .set(bearer(member5.token))
        .send({ trainerId: trainer.id, slotId })
        .expect(201);

      const updated = await prisma.membership.findUniqueOrThrow({
        where: { id: membership.id },
      });
      expect(updated.remainingClasses).toBe(1);

      const charge = await prisma.charge.findFirstOrThrow({
        where: { personalSession: { slotId } },
      });
      expect(Number(charge.amount)).toBe(9);
      expect(charge.status).toBe('Pendiente');
    });

    it('resuelve dos solicitudes concurrentes por el mismo bloque', async () => {
      const slotId = await createSlot('19:00');

      const results = await Promise.all([
        request(server())
          .post(`${BASE}/personal-sessions`)
          .set(bearer(member.token))
          .send({ trainerId: trainer.id, slotId }),
        request(server())
          .post(`${BASE}/personal-sessions`)
          .set(bearer(member2.token))
          .send({ trainerId: trainer.id, slotId }),
      ]);

      expect(
        results.map((result) => result.status).sort((a, b) => a - b),
      ).toEqual([201, 409]);
      expect(await prisma.personalSession.count({ where: { slotId } })).toBe(1);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
