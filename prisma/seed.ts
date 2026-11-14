import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  ClassSessionStatus,
  PlanType,
  ReservationStatus,
  UserRole,
} from '../src/generated/prisma/enums.js';

/**
 * Datos de prueba para desarrollo y QA.
 *
 * El seed es idempotente: usa `upsert` con identificadores fijos, así que se
 * puede correr las veces que haga falta sin duplicar filas. Los escenarios
 * cubren los criterios de aceptación del backlog en Jira:
 *
 * - H1  membresía vigente, por clases, vencida y sin membresía
 * - H2/H3  planes activos de los tres tipos y un plan retirado
 * - H5  reservas cancelables (faltan > 2 h) y no cancelables (< 2 h)
 * - H6  clases programadas, llenas, finalizadas y canceladas
 * - H9  miembros con y sin vigencia para validar el check-in
 */

const PASSWORD = 'Demo1234!';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copiá .env.example a .env y completala.',
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const reference = new Date();

/** Fecha relativa a hoy, fijada a una hora exacta para que el escenario se lea igual. */
function at(days: number, hour: number): Date {
  const date = new Date(reference.getTime() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function fromNow(milliseconds: number): Date {
  return new Date(reference.getTime() + milliseconds);
}

function daysAgo(days: number): Date {
  return fromNow(-days * DAY);
}

interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cardNumber: string;
  isActive?: boolean;
}

const USERS = {
  admin: {
    id: '11111111-1111-4111-8111-000000000001',
    email: 'admin@thechen.test',
    name: 'Recepción Admin',
    role: 'RECEPCION_ADMIN',
    cardNumber: 'EMP-2026-0001',
  },
  trainer1: {
    id: '11111111-1111-4111-8111-000000000002',
    email: 'entrenador1@thechen.test',
    name: 'Ana López',
    role: 'ENTRENADOR',
    cardNumber: 'EMP-2026-0002',
  },
  trainer2: {
    id: '11111111-1111-4111-8111-000000000003',
    email: 'entrenador2@thechen.test',
    name: 'Carlos Ruiz',
    role: 'ENTRENADOR',
    cardNumber: 'EMP-2026-0003',
  },
  // Se mantiene el usuario documentado en el README.
  demo: {
    id: '11111111-1111-4111-8111-000000000004',
    email: 'demo@example.com',
    name: 'Miembro Demo',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0001',
  },
  clases: {
    id: '11111111-1111-4111-8111-000000000005',
    email: 'miembro.clases@thechen.test',
    name: 'Miembro Clases',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0002',
  },
  vencida: {
    id: '11111111-1111-4111-8111-000000000006',
    email: 'miembro.vencida@thechen.test',
    name: 'Miembro Vencida',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0003',
  },
  sinPlan: {
    id: '11111111-1111-4111-8111-000000000007',
    email: 'miembro.sinplan@thechen.test',
    name: 'Miembro Sin Plan',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0004',
  },
  inactivo: {
    id: '11111111-1111-4111-8111-000000000008',
    email: 'miembro.inactivo@thechen.test',
    name: 'Miembro Inactivo',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0005',
    isActive: false,
  },
} satisfies Record<string, SeedUser>;

type UserKey = keyof typeof USERS;

interface SeedPlan {
  id: string;
  name: string;
  type: PlanType;
  price: string;
  durationDays?: number;
  classCount?: number;
  isActive?: boolean;
}

const PLANS = {
  mensual: {
    id: '22222222-2222-4222-8222-000000000001',
    name: 'Mensual',
    type: 'MENSUAL',
    price: '30.00',
    durationDays: 30,
  },
  trimestral: {
    id: '22222222-2222-4222-8222-000000000002',
    name: 'Trimestral',
    type: 'TRIMESTRAL',
    price: '80.00',
    durationDays: 90,
  },
  clasesSueltas: {
    id: '22222222-2222-4222-8222-000000000003',
    name: 'Clases sueltas',
    type: 'CLASES_SUELTAS',
    price: '8.00',
    classCount: 10,
  },
  retirado: {
    id: '22222222-2222-4222-8222-000000000004',
    name: 'Plan corporativo (retirado)',
    type: 'MENSUAL',
    price: '25.00',
    durationDays: 30,
    isActive: false,
  },
} satisfies Record<string, SeedPlan>;

type PlanKey = keyof typeof PLANS;

interface SeedMembership {
  id: string;
  user: UserKey;
  plan: PlanKey;
  startDate: Date;
  endDate: Date;
  remainingClasses?: number;
}

const MEMBERSHIPS: SeedMembership[] = [
  {
    id: '55555555-5555-4555-8555-000000000001',
    user: 'demo',
    plan: 'mensual',
    startDate: daysAgo(10),
    endDate: fromNow(20 * DAY),
  },
  {
    id: '55555555-5555-4555-8555-000000000002',
    user: 'clases',
    plan: 'clasesSueltas',
    startDate: daysAgo(5),
    endDate: fromNow(25 * DAY),
    remainingClasses: 4,
  },
  {
    id: '55555555-5555-4555-8555-000000000003',
    user: 'vencida',
    plan: 'mensual',
    startDate: daysAgo(40),
    endDate: daysAgo(10),
  },
];

interface SeedClassSession {
  id: string;
  name: string;
  trainer: UserKey;
  startsAt: Date;
  durationMin: number;
  capacity: number;
  status: ClassSessionStatus;
}

const CLASS_SESSIONS = {
  yoga: {
    id: '33333333-3333-4333-8333-000000000001',
    name: 'Yoga Flow',
    trainer: 'trainer1',
    startsAt: at(2, 8),
    durationMin: 60,
    capacity: 20,
    status: 'Programada',
  },
  funcional: {
    id: '33333333-3333-4333-8333-000000000002',
    name: 'Funcional',
    trainer: 'trainer2',
    startsAt: at(3, 18),
    durationMin: 60,
    capacity: 2,
    status: 'Programada',
  },
  spinning: {
    id: '33333333-3333-4333-8333-000000000003',
    name: 'Spinning',
    trainer: 'trainer1',
    startsAt: fromNow(6 * HOUR),
    durationMin: 60,
    capacity: 10,
    status: 'Programada',
  },
  pilates: {
    id: '33333333-3333-4333-8333-000000000004',
    name: 'Pilates',
    trainer: 'trainer2',
    startsAt: fromNow(1 * HOUR),
    durationMin: 60,
    capacity: 10,
    status: 'Programada',
  },
  crossfit: {
    id: '33333333-3333-4333-8333-000000000005',
    name: 'CrossFit',
    trainer: 'trainer1',
    startsAt: daysAgo(2),
    durationMin: 60,
    capacity: 15,
    status: 'Finalizada',
  },
  zumba: {
    id: '33333333-3333-4333-8333-000000000006',
    name: 'Zumba',
    trainer: 'trainer2',
    startsAt: at(4, 19),
    durationMin: 60,
    capacity: 12,
    status: 'Cancelada',
  },
} satisfies Record<string, SeedClassSession>;

type ClassSessionKey = keyof typeof CLASS_SESSIONS;

interface SeedReservation {
  id: string;
  session: ClassSessionKey;
  member: UserKey;
  status: ReservationStatus;
  cancelledAt?: Date;
}

const RESERVATIONS: SeedReservation[] = [
  // Yoga Flow: hay cupo y faltan días, sirve para cancelar (H5).
  {
    id: '44444444-4444-4444-8444-000000000001',
    session: 'yoga',
    member: 'demo',
    status: 'Activa',
  },
  // Spinning: faltan 6 h, también se puede cancelar.
  {
    id: '44444444-4444-4444-8444-000000000002',
    session: 'spinning',
    member: 'demo',
    status: 'Activa',
  },
  // Funcional: cupo 2 ocupado por dos reservas activas (clase llena).
  {
    id: '44444444-4444-4444-8444-000000000003',
    session: 'funcional',
    member: 'demo',
    status: 'Activa',
  },
  {
    id: '44444444-4444-4444-8444-000000000004',
    session: 'funcional',
    member: 'clases',
    status: 'Activa',
  },
  // Pilates: empieza en 1 h, la cancelación debe rechazarse (H5).
  {
    id: '44444444-4444-4444-8444-000000000005',
    session: 'pilates',
    member: 'clases',
    status: 'Activa',
  },
  // Reserva histórica ya cancelada.
  {
    id: '44444444-4444-4444-8444-000000000006',
    session: 'zumba',
    member: 'vencida',
    status: 'Cancelada',
    cancelledAt: daysAgo(1),
  },
];

async function seedUsers(
  passwordHash: string,
): Promise<Record<UserKey, string>> {
  const ids = {} as Record<UserKey, string>;

  for (const key of Object.keys(USERS) as UserKey[]) {
    const user = USERS[key];
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        name: user.name,
        role: user.role,
        cardNumber: user.cardNumber,
        isActive: user.isActive ?? true,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        cardNumber: user.cardNumber,
        passwordHash,
        isActive: user.isActive ?? true,
      },
    });
    ids[key] = row.id;
  }

  return ids;
}

async function seedPlans(): Promise<Record<PlanKey, string>> {
  const ids = {} as Record<PlanKey, string>;

  for (const key of Object.keys(PLANS) as PlanKey[]) {
    const plan = PLANS[key];
    const row = await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        type: plan.type,
        price: plan.price,
        durationDays: plan.durationDays ?? null,
        classCount: plan.classCount ?? null,
        isActive: plan.isActive ?? true,
      },
      create: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationDays: plan.durationDays ?? null,
        classCount: plan.classCount ?? null,
        isActive: plan.isActive ?? true,
      },
    });
    ids[key] = row.id;
  }

  return ids;
}

async function seedMemberships(
  users: Record<UserKey, string>,
  plans: Record<PlanKey, string>,
): Promise<void> {
  for (const membership of MEMBERSHIPS) {
    const data = {
      userId: users[membership.user],
      planId: plans[membership.plan],
      startDate: membership.startDate,
      endDate: membership.endDate,
      remainingClasses: membership.remainingClasses ?? null,
    };

    await prisma.membership.upsert({
      where: { id: membership.id },
      update: data,
      create: { id: membership.id, ...data },
    });
  }
}

async function seedClassSessions(
  users: Record<UserKey, string>,
): Promise<Record<ClassSessionKey, string>> {
  const ids = {} as Record<ClassSessionKey, string>;

  for (const key of Object.keys(CLASS_SESSIONS) as ClassSessionKey[]) {
    const session = CLASS_SESSIONS[key];
    const data = {
      name: session.name,
      trainerId: users[session.trainer],
      startsAt: session.startsAt,
      durationMin: session.durationMin,
      capacity: session.capacity,
      status: session.status,
    };

    const row = await prisma.classSession.upsert({
      where: { id: session.id },
      update: data,
      create: { id: session.id, ...data },
    });
    ids[key] = row.id;
  }

  return ids;
}

async function seedReservations(
  users: Record<UserKey, string>,
  sessions: Record<ClassSessionKey, string>,
): Promise<void> {
  for (const reservation of RESERVATIONS) {
    const sessionId = sessions[reservation.session];
    const memberId = users[reservation.member];
    const data = {
      status: reservation.status,
      cancelledAt: reservation.cancelledAt ?? null,
    };

    await prisma.reservation.upsert({
      where: { sessionId_memberId: { sessionId, memberId } },
      update: data,
      create: { id: reservation.id, sessionId, memberId, ...data },
    });
  }
}

interface SeedTrainerSlot {
  id: string;
  trainer: UserKey;
  date: Date;
  startTime: string;
  endTime: string;
  isBooked?: boolean;
}

/** Fecha sin hora, en UTC, para columnas `@db.Date`. */
function dateAt(days: number): Date {
  const date = new Date(reference.getTime() + days * DAY);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

const TRAINER_SLOTS = {
  trainer1Morning: {
    id: '66666666-6666-4666-8666-000000000001',
    trainer: 'trainer1',
    date: dateAt(2),
    startTime: '09:00',
    endTime: '10:00',
  },
  trainer1Booked: {
    id: '66666666-6666-4666-8666-000000000002',
    trainer: 'trainer1',
    date: dateAt(2),
    startTime: '11:00',
    endTime: '12:00',
    isBooked: true,
  },
  trainer2Afternoon: {
    id: '66666666-6666-4666-8666-000000000003',
    trainer: 'trainer2',
    date: dateAt(3),
    startTime: '15:00',
    endTime: '16:00',
  },
} satisfies Record<string, SeedTrainerSlot>;

type TrainerSlotKey = keyof typeof TRAINER_SLOTS;

async function seedTrainerSlots(
  users: Record<UserKey, string>,
): Promise<Record<TrainerSlotKey, string>> {
  const ids = {} as Record<TrainerSlotKey, string>;

  for (const key of Object.keys(TRAINER_SLOTS) as TrainerSlotKey[]) {
    const slot = TRAINER_SLOTS[key];
    const trainerId = users[slot.trainer];
    const data = {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isBooked: slot.isBooked ?? false,
    };

    const row = await prisma.trainerSlot.upsert({
      where: {
        trainerId_date_startTime: {
          trainerId,
          date: slot.date,
          startTime: slot.startTime,
        },
      },
      update: data,
      create: { id: slot.id, trainerId, ...data },
    });
    ids[key] = row.id;
  }

  return ids;
}

async function seedPersonalSessions(
  users: Record<UserKey, string>,
  slots: Record<TrainerSlotKey, string>,
): Promise<void> {
  const session = await prisma.personalSession.upsert({
    where: { slotId: slots.trainer1Booked },
    update: {
      memberId: users.demo,
      status: 'Agendada',
    },
    create: {
      id: '77777777-7777-4777-8777-000000000001',
      slotId: slots.trainer1Booked,
      memberId: users.demo,
      status: 'Agendada',
    },
  });

  await prisma.charge.upsert({
    where: { personalSessionId: session.id },
    update: { amount: 0, status: 'Pendiente' },
    create: {
      id: '88888888-8888-4888-8888-000000000001',
      personalSessionId: session.id,
      amount: 0,
      status: 'Pendiente',
    },
  });
}

function printSummary(): void {
  const accounts = Object.keys(USERS) as UserKey[];

  console.log('\nCuentas de prueba (contraseña: %s)', PASSWORD);
  console.table(
    accounts.map((key) => ({
      escenario: key,
      email: USERS[key].email,
      rol: USERS[key].role,
      carné: USERS[key].cardNumber,
      activo: USERS[key].isActive ?? true,
    })),
  );

  console.log('Membresías');
  console.table([
    { miembro: USERS.demo.email, plan: 'Mensual', estado: 'Vigente' },
    {
      miembro: USERS.clases.email,
      plan: 'Clases sueltas',
      estado: 'Vigente (4 clases restantes)',
    },
    { miembro: USERS.vencida.email, plan: 'Mensual', estado: 'Vencida' },
    { miembro: USERS.sinPlan.email, plan: '—', estado: 'Sin membresía' },
  ]);

  console.log('Clases');
  console.table(
    (Object.keys(CLASS_SESSIONS) as ClassSessionKey[]).map((key) => ({
      clase: CLASS_SESSIONS[key].name,
      estado: CLASS_SESSIONS[key].status,
      cupo: CLASS_SESSIONS[key].capacity,
      inicio: CLASS_SESSIONS[key].startsAt.toISOString(),
    })),
  );
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const users = await seedUsers(passwordHash);
  const plans = await seedPlans();

  await seedMemberships(users, plans);

  const sessions = await seedClassSessions(users);
  await seedReservations(users, sessions);

  const slots = await seedTrainerSlots(users);
  await seedPersonalSessions(users, slots);

  printSummary();
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
