// Contrato que consume el frontend: campos que sus adaptadores exigen para no
// lanzar ContractError, más los endpoints que faltaban (H14/H15/H19).
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/services/index.js';

const BASE = '/api';
const PASSWORD = 'Demo1234!';

interface Actor {
  id: string;
  token: string;
}

describe('Contrato del frontend', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Actor;
  let trainer: Actor;
  let member: Actor;
  let other: Actor;
  let counter = 0;
  const stamp = Date.now();

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

    return { id: created.body.id, token: login.body.accessToken };
  };

  // El alta de clases interpreta `date` + `startTime` en hora local, así que la
  // fecha de prueba también se calcula en local.
  const localDate = (offsetDays: number): string => {
    const date = new Date(Date.now() + offsetDays * 86_400_000);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const SOON_DATE = localDate(1);

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

    admin = await register('admin', 'Admin Uno');
    trainer = await register('trainer', 'Ana López');
    member = await register('member', 'Miembro Uno');
    other = await register('other', 'Otro Miembro');
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'RECEPCION_ADMIN' },
    });
    await prisma.user.update({
      where: { id: trainer.id },
      data: { role: 'ENTRENADOR' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /plans', () => {
    it('informa durationDays numérico también en planes sin duración', async () => {
      const plan = await prisma.plan.create({
        data: {
          name: `Clases sueltas-${stamp}`,
          type: 'CLASES_SUELTAS',
          price: 8,
          classCount: 10,
          durationDays: null,
        },
      });

      const res = await request(server())
        .get(`${BASE}/plans`)
        .set(bearer(member.token))
        .expect(200);

      const row = res.body.data.find(
        (item: { id: string }) => item.id === plan.id,
      );
      expect(row).toMatchObject({
        durationDays: 30,
        classCount: 10,
        active: true,
      });
      expect(typeof row.durationDays).toBe('number');
    });
  });

  describe('GET /class-sessions', () => {
    it('incluye trainerId, date, startTime, durationMinutes y maxCapacity', async () => {
      const created = await request(server())
        .post(`${BASE}/classes`)
        .set(bearer(admin.token))
        .send({
          name: `Spinning-${stamp}`,
          trainerId: trainer.id,
          date: SOON_DATE,
          startTime: '09:15',
          durationMinutes: 45,
          maxCapacity: 7,
        })
        .expect(201);

      const res = await request(server())
        .get(`${BASE}/class-sessions`)
        .set(bearer(member.token))
        .expect(200);

      const row = res.body.find(
        (item: { id: string }) => item.id === created.body.id,
      );
      expect(row).toMatchObject({
        trainerId: trainer.id,
        trainerName: 'Ana López',
        date: SOON_DATE,
        startTime: '09:15',
        durationMinutes: 45,
        maxCapacity: 7,
        availableSpots: 7,
        reservedCount: 0,
        status: 'Programada',
      });
      // Los nombres anteriores siguen viajando para no romper clientes viejos.
      expect(row).toMatchObject({ durationMin: 45, capacity: 7 });
    });
  });

  describe('GET /notifications/me', () => {
    it('pagina de 10 en 10 y devuelve unreadCount', async () => {
      const recipient = await register('notif');

      await prisma.notification.createMany({
        data: Array.from({ length: 12 }, (_, index) => ({
          recipientId: recipient.id,
          title: `Aviso ${index}`,
          message: `Mensaje ${index}`,
          sourceModule: 'CLASES' as const,
          isRead: false,
          createdAt: new Date(Date.now() - index * 60_000),
        })),
      });

      const first = await request(server())
        .get(`${BASE}/notifications/me?page=1`)
        .set(bearer(recipient.token))
        .expect(200);

      expect(first.body).toMatchObject({
        unreadCount: 12,
        page: 1,
        pageSize: 10,
        total: 12,
      });
      expect(first.body.data).toHaveLength(10);
      expect(first.body.data[0]).toMatchObject({
        title: 'Aviso 0',
        message: 'Mensaje 0',
        isRead: false,
      });
      expect(typeof first.body.data[0].createdAt).toBe('string');

      const second = await request(server())
        .get(`${BASE}/notifications/me?page=2`)
        .set(bearer(recipient.token))
        .expect(200);
      expect(second.body.data).toHaveLength(2);

      const notificationId = first.body.data[0].id as string;

      await request(server())
        .patch(`${BASE}/notifications/${notificationId}/read`)
        .set(bearer(other.token))
        .expect(404);

      const marked = await request(server())
        .patch(`${BASE}/notifications/${notificationId}/read`)
        .set(bearer(recipient.token))
        .expect(200);
      expect(marked.body).toMatchObject({ id: notificationId, isRead: true });

      const after = await request(server())
        .get(`${BASE}/notifications/me?page=1`)
        .set(bearer(recipient.token))
        .expect(200);
      expect(after.body.unreadCount).toBe(11);
    });
  });

  describe('equipment', () => {
    it('lista con las etiquetas del contrato y filtra por estado', async () => {
      const machine = await prisma.machine.create({
        data: { name: `Cinta ${stamp}`, category: 'Cardio' },
      });

      const list = await request(server())
        .get(`${BASE}/equipment`)
        .set(bearer(member.token))
        .expect(200);

      expect(
        list.body.data.find((item: { id: string }) => item.id === machine.id),
      ).toMatchObject({
        name: `Cinta ${stamp}`,
        category: 'Cardio',
        status: 'Operativa',
        reason: null,
      });

      const filtered = await request(server())
        .get(`${BASE}/equipment`)
        .query({ status: 'En Mantenimiento' })
        .set(bearer(member.token))
        .expect(200);
      expect(
        filtered.body.data.some(
          (item: { id: string }) => item.id === machine.id,
        ),
      ).toBe(false);

      await request(server())
        .get(`${BASE}/equipment`)
        .query({ status: 'Rota' })
        .set(bearer(member.token))
        .expect(400);
    });

    it('cambia el estado con motivo y deja bitácora', async () => {
      const machine = await prisma.machine.create({
        data: { name: `Remo ${stamp}` },
      });
      const statusPath = `${BASE}/equipment/${machine.id}/status`;

      await request(server())
        .patch(statusPath)
        .set(bearer(member.token))
        .send({ status: 'En Mantenimiento', reason: 'Banda desgastada' })
        .expect(403);

      await request(server())
        .patch(statusPath)
        .set(bearer(admin.token))
        .send({ status: 'En Mantenimiento' })
        .expect(400);

      const changed = await request(server())
        .patch(statusPath)
        .set(bearer(admin.token))
        .send({ status: 'En Mantenimiento', reason: '  Banda desgastada  ' })
        .expect(200);

      expect(changed.body).toMatchObject({
        id: machine.id,
        status: 'En Mantenimiento',
        reason: 'Banda desgastada',
      });

      const log = await prisma.machineStatusLog.findFirstOrThrow({
        where: { machineId: machine.id },
      });
      expect(log).toMatchObject({
        previousStatus: 'OPERATIVA',
        newStatus: 'EN_MANTENIMIENTO',
        reason: 'Banda desgastada',
        changedById: admin.id,
      });

      await request(server())
        .patch(statusPath)
        .set(bearer(admin.token))
        .send({ status: 'Operativa' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({ status: 'Operativa', reason: null });
        });

      await request(server())
        .patch(`${BASE}/equipment/${machine.id}/status`)
        .set(bearer(admin.token))
        .send({ status: 'Rota', reason: 'No aplica' })
        .expect(400);
    });
  });
});
