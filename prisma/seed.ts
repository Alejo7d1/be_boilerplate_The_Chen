import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  AccessResult,
  ChargeStatus,
  ClassSessionStatus,
  MachineStatus,
  MembershipStatus,
  NotificationSource,
  PlanType,
  ReservationStatus,
  ReviewTargetType,
  SessionStatus,
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
 * - H9  check-in: miembros con y sin vigencia + historial de accesos
 * - H10 cobros pendientes pagables (4242 aprueba, 0002 rechaza) y pagos con comprobante REC-XXXXX
 * - H11 12 cobros pendientes (2 páginas), de varios miembros y fechas, y un cobro anulado
 * - H12 rutina activa y miembros que son / no son clientes activos del entrenador
 * - H13 historial de progreso (varios registros) y un miembro con un único registro base
 * - H14/H15 máquinas en los 3 estados con historial de cambios
 * - H16/H17 reseñas, miembros con asistencia sin reseñar, clase sin reseñas y plazo de 7 días vencido
 * - H18/H19 bandeja con paginación (12 notificaciones) y no leídas
 * - H20/H21 ocupación con empate de porcentaje y renovaciones dentro / fuera de los 30 días
 */

const PASSWORD = 'Demo1234!';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const CARD_LAST4 = '4242';
const CARD_EXP_MONTH = 12;
const CARD_EXP_YEAR = 2030;
const PERSONAL_SESSION_PRICE = '15.00';

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

/** Fecha sin hora, en UTC, para columnas `@db.Date`. */
function dateAt(days: number): Date {
  const date = new Date(reference.getTime() + days * DAY);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

/** UUID v4 determinista: `tag` son 4 caracteres hex, `n` el correlativo. */
function uuid(tag: string, n: number): string {
  return `${tag}${tag}-${tag}-4${tag.slice(1)}-8${tag.slice(1)}-${String(n).padStart(12, '0')}`;
}

interface SeedUser {
  id: string;
  email: string;
  surname?: string;
  name: string;
  role: UserRole;
  cardNumber: string;
  isActive?: boolean;
}

const USERS = {
  admin: {
    id: '11111111-1111-4111-8111-000000000001',
    email: 'admin@thechen.test',
    surname: 'Admin',
    name: 'Recepción Admin',
    role: 'RECEPCION_ADMIN',
    cardNumber: 'EMP-2026-0001',
  },
  trainer1: {
    id: '11111111-1111-4111-8111-000000000002',
    email: 'entrenador1@thechen.test',
    surname: 'López',
    name: 'Ana López',
    role: 'ENTRENADOR',
    cardNumber: 'EMP-2026-0002',
  },
  trainer2: {
    id: '11111111-1111-4111-8111-000000000003',
    email: 'entrenador2@thechen.test',
    surname: 'Ruiz',
    name: 'Carlos Ruiz',
    role: 'ENTRENADOR',
    cardNumber: 'EMP-2026-0003',
  },
  // Se mantiene el usuario documentado en el README.
  demo: {
    id: '11111111-1111-4111-8111-000000000004',
    email: 'demo@example.com',
    surname: 'Demo',
    name: 'Miembro Demo',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0001',
  },
  clases: {
    id: '11111111-1111-4111-8111-000000000005',
    email: 'miembro.clases@thechen.test',
    surname: 'Clases',
    name: 'Miembro Clases',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0002',
  },
  vencida: {
    id: '11111111-1111-4111-8111-000000000006',
    email: 'miembro.vencida@thechen.test',
    surname: 'Vencida',
    name: 'Miembro Vencida',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0003',
  },
  sinPlan: {
    id: '11111111-1111-4111-8111-000000000007',
    email: 'miembro.sinplan@thechen.test',
    surname: 'Sin Plan',
    name: 'Miembro Sin Plan',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0004',
  },
  inactivo: {
    id: '11111111-1111-4111-8111-000000000008',
    email: 'miembro.inactivo@thechen.test',
    surname: 'Inactivo',
    name: 'Miembro Inactivo',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0005',
    isActive: false,
  },
  // H9: segundo usuario administrativo (recepción) para registrar ingresos.
  recepcion: {
    id: '11111111-1111-4111-8111-000000000009',
    email: 'recepcion@thechen.test',
    surname: 'Recepción',
    name: 'Recepción Turno Día',
    role: 'RECEPCION_ADMIN',
    cardNumber: 'EMP-2026-0004',
  },
  // H21: renovó dentro de los 30 días posteriores al vencimiento.
  renovo: {
    id: '11111111-1111-4111-8111-000000000010',
    email: 'miembro.renovo@thechen.test',
    surname: 'Renovó',
    name: 'Miembro Renovó',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0006',
  },
  // H21: renovó pasados los 30 días (no cuenta como renovación).
  tardio: {
    id: '11111111-1111-4111-8111-000000000011',
    email: 'miembro.tardio@thechen.test',
    surname: 'Tardío',
    name: 'Miembro Tardío',
    role: 'MIEMBRO',
    cardNumber: 'MEM-2026-0007',
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
  benefits?: string;
  isActive?: boolean;
}

const PLANS = {
  mensual: {
    id: '22222222-2222-4222-8222-000000000001',
    name: 'Mensual',
    type: 'MENSUAL',
    price: '30.00',
    durationDays: 30,
    benefits: 'Acceso libre al gimnasio y clases grupales',
  },
  trimestral: {
    id: '22222222-2222-4222-8222-000000000002',
    name: 'Trimestral',
    type: 'TRIMESTRAL',
    price: '80.00',
    durationDays: 90,
    benefits: 'Acceso libre, clases grupales y una evaluación física',
  },
  clasesSueltas: {
    id: '22222222-2222-4222-8222-000000000003',
    name: 'Clases sueltas',
    type: 'CLASES_SUELTAS',
    price: '8.00',
    classCount: 10,
    benefits: 'Paquete de 10 clases grupales',
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
  status?: MembershipStatus;
  /** H21: id de la membresía que esta renueva. */
  renewedFromId?: string;
}

const MEMBERSHIP_RENOVO_OLD = '55555555-5555-4555-8555-000000000004';
const MEMBERSHIP_TARDIO_OLD = '55555555-5555-4555-8555-000000000006';

// El orden importa: las renovaciones van después de la membresía que renuevan.
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
    status: 'VENCIDA',
  },
  // H21: venció hace 45 días y se renovó 5 días después → cuenta como renovada.
  {
    id: MEMBERSHIP_RENOVO_OLD,
    user: 'renovo',
    plan: 'mensual',
    startDate: daysAgo(75),
    endDate: daysAgo(45),
    status: 'VENCIDA',
  },
  {
    id: '55555555-5555-4555-8555-000000000005',
    user: 'renovo',
    plan: 'trimestral',
    startDate: daysAgo(40),
    endDate: fromNow(50 * DAY),
    renewedFromId: MEMBERSHIP_RENOVO_OLD,
  },
  // H21: venció hace 70 días y se renovó 40 días después → NO cuenta (> 30 días).
  {
    id: MEMBERSHIP_TARDIO_OLD,
    user: 'tardio',
    plan: 'mensual',
    startDate: daysAgo(100),
    endDate: daysAgo(70),
    status: 'VENCIDA',
  },
  {
    id: '55555555-5555-4555-8555-000000000007',
    user: 'tardio',
    plan: 'trimestral',
    startDate: daysAgo(30),
    endDate: fromNow(60 * DAY),
    renewedFromId: MEMBERSHIP_TARDIO_OLD,
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
  cancellationReason?: string;
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
  // Finalizada hace 2 días: dentro del plazo de 7 días para calificar (H16).
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
    cancellationReason: 'Instructor no disponible',
  },
  // Finalizada hace 10 días: plazo de 7 días vencido (H16) y 50 % de ocupación (H20).
  hiit: {
    id: '33333333-3333-4333-8333-000000000007',
    name: 'HIIT',
    trainer: 'trainer2',
    startsAt: daysAgo(10),
    durationMin: 45,
    capacity: 8,
    status: 'Finalizada',
  },
  // Mismo 50 % que HIIT pero con menos reservas → desempate de H20; sin reseñas (H17).
  stretching: {
    id: '33333333-3333-4333-8333-000000000008',
    name: 'Stretching',
    trainer: 'trainer1',
    startsAt: daysAgo(12),
    durationMin: 45,
    capacity: 4,
    status: 'Finalizada',
  },
} satisfies Record<string, SeedClassSession>;

type ClassSessionKey = keyof typeof CLASS_SESSIONS;

interface SeedReservation {
  id: string;
  session: ClassSessionKey;
  member: UserKey;
  status: ReservationStatus;
  cancelledAt?: Date;
  /** H16: true registra asistencia (attendedAt = inicio de la clase). */
  attended?: boolean;
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
  // CrossFit (H16): demo y clases ya reseñaron; renovó asistió y puede reseñar;
  // vencida reservó pero NO tiene asistencia → no puede calificar (403).
  {
    id: '44444444-4444-4444-8444-000000000007',
    session: 'crossfit',
    member: 'demo',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000008',
    session: 'crossfit',
    member: 'clases',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000009',
    session: 'crossfit',
    member: 'renovo',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000010',
    session: 'crossfit',
    member: 'vencida',
    status: 'Activa',
  },
  // HIIT: 4 de 8 cupos (50 %); demo asistió pero el plazo de 7 días ya venció.
  {
    id: '44444444-4444-4444-8444-000000000011',
    session: 'hiit',
    member: 'demo',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000012',
    session: 'hiit',
    member: 'clases',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000013',
    session: 'hiit',
    member: 'vencida',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000014',
    session: 'hiit',
    member: 'renovo',
    status: 'Activa',
    attended: true,
  },
  // Stretching: 2 de 4 cupos (50 %), sin reseñas.
  {
    id: '44444444-4444-4444-8444-000000000015',
    session: 'stretching',
    member: 'renovo',
    status: 'Activa',
    attended: true,
  },
  {
    id: '44444444-4444-4444-8444-000000000016',
    session: 'stretching',
    member: 'vencida',
    status: 'Activa',
    attended: true,
  },
];

interface SeedTrainerSlot {
  id: string;
  trainer: UserKey;
  date: Date;
  startTime: string;
  endTime: string;
  isBooked?: boolean;
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
  // Bloque pasado ya impartido (H12 cliente activo, H16 reseña de sesión personal).
  trainer2Past: {
    id: '66666666-6666-4666-8666-000000000004',
    trainer: 'trainer2',
    date: dateAt(-3),
    startTime: '10:00',
    endTime: '11:00',
    isBooked: true,
  },
} satisfies Record<string, SeedTrainerSlot>;

type TrainerSlotKey = keyof typeof TRAINER_SLOTS;

interface SeedPersonalSession {
  id: string;
  slot: TrainerSlotKey;
  member: UserKey;
  trainer: UserKey;
  status: SessionStatus;
  chargeId: string;
}

const PERSONAL_SESSIONS = {
  // demo → cliente activo de trainer1; cobro pendiente para probar H10.
  demoAgendada: {
    id: '77777777-7777-4777-8777-000000000001',
    slot: 'trainer1Booked',
    member: 'demo',
    trainer: 'trainer1',
    status: 'Agendada',
    chargeId: '88888888-8888-4888-8888-000000000001',
  },
  // clases → cliente activo de trainer2; sesión impartida y cobro pagado.
  clasesCompletada: {
    id: '77777777-7777-4777-8777-000000000002',
    slot: 'trainer2Past',
    member: 'clases',
    trainer: 'trainer2',
    status: 'Completada',
    chargeId: '88888888-8888-4888-8888-000000000002',
  },
} satisfies Record<string, SeedPersonalSession>;

type PersonalSessionKey = keyof typeof PERSONAL_SESSIONS;

// ---------------------------------------------------------------
// Cobros y pagos (H2, H8, H10, H11, H20/H21)
// ---------------------------------------------------------------

interface ChargeInput {
  id: string;
  userId: string;
  planId?: string;
  membershipId?: string;
  personalSessionId?: string;
  amount: string;
  status: ChargeStatus;
  concept: string;
  createdAt?: Date;
  receiptNumber?: string;
  last4?: string;
  paidAt?: Date;
}

async function upsertCharge(input: ChargeInput): Promise<void> {
  const { id, createdAt, ...rest } = input;
  const data = {
    userId: rest.userId,
    planId: rest.planId ?? null,
    membershipId: rest.membershipId ?? null,
    personalSessionId: rest.personalSessionId ?? null,
    amount: rest.amount,
    status: rest.status,
    concept: rest.concept,
    receiptNumber: rest.receiptNumber ?? null,
    last4: rest.last4 ?? null,
    paidAt: rest.paidAt ?? null,
    ...(createdAt ? { createdAt } : {}),
  };
  await prisma.charge.upsert({
    where: { id },
    update: data,
    create: { id, ...data },
  });
}

/** Último correlativo emitido por el seed; al final se sincroniza la secuencia. */
let lastReceiptSeq = 0;

/** Cobro Pagada + registro Payment con comprobante REC-XXXXX. */
async function seedPaidCharge(
  input: Omit<ChargeInput, 'status' | 'receiptNumber' | 'last4'> & {
    paidAt: Date;
  },
): Promise<void> {
  lastReceiptSeq += 1;
  const receiptNumber = `REC-${String(lastReceiptSeq).padStart(5, '0')}`;

  await upsertCharge({
    ...input,
    status: 'Pagada',
    receiptNumber,
    last4: CARD_LAST4,
  });

  const payment = {
    receiptSeq: lastReceiptSeq,
    receiptNumber,
    amount: input.amount,
    last4: CARD_LAST4,
    expMonth: CARD_EXP_MONTH,
    expYear: CARD_EXP_YEAR,
  };
  await prisma.payment.upsert({
    where: { chargeId: input.id },
    update: payment,
    create: { id: uuid('0a0a', lastReceiptSeq), chargeId: input.id, ...payment },
  });
}

/** H2/H10: un cobro pagado por cada compra o renovación de membresía del seed. */
async function seedMembershipCharges(
  users: Record<UserKey, string>,
  plans: Record<PlanKey, string>,
): Promise<void> {
  for (const [index, membership] of MEMBERSHIPS.entries()) {
    const plan = PLANS[membership.plan];
    const number = String(index + 1).padStart(4, '0');
    await seedPaidCharge({
      id: `99999999-9999-4999-8999-00000000${number}`,
      userId: users[membership.user],
      planId: plans[membership.plan],
      membershipId: membership.id,
      amount: plan.price,
      concept: membership.renewedFromId
        ? `Renovación Membresía ${plan.name}`
        : `Compra de plan ${plan.name}`,
      paidAt: membership.startDate,
      createdAt: membership.startDate,
    });
  }
}

/** H11: cobros pendientes extra (2 páginas) y un cobro anulado. */
async function seedExtraCharges(
  users: Record<UserKey, string>,
  plans: Record<PlanKey, string>,
): Promise<void> {
  const members: UserKey[] = ['demo', 'clases', 'vencida', 'sinPlan', 'renovo'];
  const planKeys: PlanKey[] = ['mensual', 'trimestral', 'clasesSueltas'];

  for (let i = 1; i <= 11; i += 1) {
    const member = members[(i - 1) % members.length]!;
    const planKey = planKeys[(i - 1) % planKeys.length]!;
    await upsertCharge({
      id: uuid('bad0', i),
      userId: users[member],
      planId: plans[planKey],
      amount: PLANS[planKey].price,
      status: 'Pendiente',
      concept: `Renovación Membresía ${PLANS[planKey].name}`,
      createdAt: daysAgo(i * 2),
    });
  }

  await upsertCharge({
    id: uuid('bad0', 100),
    userId: users.vencida,
    planId: plans.mensual,
    amount: PLANS.mensual.price,
    status: 'Anulada',
    concept: 'Renovación Membresía Mensual (anulada)',
    createdAt: daysAgo(6),
  });
}

// ---------------------------------------------------------------
// H9 — Accesos
// ---------------------------------------------------------------

interface SeedAccessLog {
  n: number;
  member: UserKey;
  result: AccessResult;
  registeredBy: UserKey;
  timestamp: Date;
}

const ACCESS_LOGS: SeedAccessLog[] = [
  { n: 1, member: 'demo', result: 'Permitido', registeredBy: 'recepcion', timestamp: at(-3, 7) },
  { n: 2, member: 'demo', result: 'Permitido', registeredBy: 'recepcion', timestamp: at(-1, 9) },
  { n: 3, member: 'clases', result: 'Permitido', registeredBy: 'recepcion', timestamp: at(-1, 10) },
  // Vencida: primero se deniega y al día siguiente recepción autoriza por excepción.
  { n: 4, member: 'vencida', result: 'Denegado', registeredBy: 'recepcion', timestamp: at(-2, 18) },
  { n: 5, member: 'vencida', result: 'Excepcion', registeredBy: 'admin', timestamp: at(-1, 18) },
];

// ---------------------------------------------------------------
// H12 — Rutinas
// ---------------------------------------------------------------

const ROUTINE_DEMO = {
  id: uuid('feed', 1),
  member: 'demo',
  trainer: 'trainer1',
  exercises: [
    { name: 'Sentadilla', series: 4, reps: 10 },
    { name: 'Press de banca', series: 4, reps: 8 },
    { name: 'Remo con barra', series: 3, reps: 12 },
  ],
} satisfies {
  id: string;
  member: UserKey;
  trainer: UserKey;
  exercises: { name: string; series: number; reps: number }[];
};

// ---------------------------------------------------------------
// H13 — Progreso físico
// ---------------------------------------------------------------

interface SeedProgress {
  n: number;
  member: UserKey;
  daysAgo: number;
  weight: string;
  waist: string;
  chest: string;
  marks?: { exerciseName: string; weightLifted: string; repetitions: number }[];
}

const PROGRESS: SeedProgress[] = [
  {
    n: 1, member: 'demo', daysAgo: 84, weight: '82.5', waist: '94.0', chest: '104.0',
    marks: [{ exerciseName: 'Press de banca', weightLifted: '60.0', repetitions: 8 }],
  },
  {
    n: 2, member: 'demo', daysAgo: 56, weight: '80.8', waist: '92.5', chest: '104.5',
    marks: [
      { exerciseName: 'Press de banca', weightLifted: '65.0', repetitions: 8 },
      { exerciseName: 'Sentadilla', weightLifted: '80.0', repetitions: 8 },
    ],
  },
  { n: 3, member: 'demo', daysAgo: 28, weight: '79.4', waist: '91.0', chest: '105.0' },
  {
    n: 4, member: 'demo', daysAgo: 3, weight: '78.6', waist: '90.2', chest: '105.4',
    marks: [{ exerciseName: 'Press de banca', weightLifted: '72.5', repetitions: 6 }],
  },
  // Un único registro: la gráfica muestra solo el punto base con diferencia 0.0.
  { n: 5, member: 'renovo', daysAgo: 2, weight: '70.0', waist: '78.0', chest: '92.0' },
];

// ---------------------------------------------------------------
// H14 / H15 — Máquinas
// ---------------------------------------------------------------

interface SeedMachine {
  id: string;
  name: string;
  category: string;
  status: MachineStatus;
  reason?: string;
}

const MACHINES = {
  bancoPlano: { id: uuid('bace', 1), name: 'Banco Plano', category: 'Fuerza', status: 'OPERATIVA' },
  bicicleta: { id: uuid('bace', 2), name: 'Bicicleta Estática', category: 'Cardio', status: 'OPERATIVA' },
  caminadora: {
    id: uuid('bace', 3), name: 'Caminadora Pro 3000', category: 'Cardio',
    status: 'EN_MANTENIMIENTO', reason: 'Calibración de banda y motor principal.',
  },
  eliptica: {
    id: uuid('bace', 4), name: 'Elíptica X200', category: 'Cardio',
    status: 'FUERA_DE_SERVICIO', reason: 'Falla en el sistema de resistencia.',
  },
  jaula: { id: uuid('bace', 5), name: 'Jaula de Sentadillas', category: 'Fuerza', status: 'OPERATIVA' },
  polea: {
    id: uuid('bace', 6), name: 'Polea Alta', category: 'Fuerza',
    status: 'EN_MANTENIMIENTO', reason: 'Reparación de cable de acero en polea principal.',
  },
  // Pasó por mantenimiento y volvió a operativa: ya no se muestra motivo de indisponibilidad.
  prensa: { id: uuid('bace', 7), name: 'Prensa de Pecho', category: 'Fuerza', status: 'OPERATIVA' },
  remo: { id: uuid('bace', 8), name: 'Remo Concept', category: 'Cardio', status: 'OPERATIVA' },
} satisfies Record<string, SeedMachine>;

type MachineKey = keyof typeof MACHINES;

interface SeedMachineLog {
  n: number;
  machine: MachineKey;
  previous: MachineStatus | null;
  next: MachineStatus;
  reason?: string;
  changedBy: UserKey;
  createdAt: Date;
}

const MACHINE_LOGS: SeedMachineLog[] = [
  {
    n: 1, machine: 'caminadora', previous: 'OPERATIVA', next: 'EN_MANTENIMIENTO',
    reason: 'Calibración de banda y motor principal.', changedBy: 'admin', createdAt: daysAgo(2),
  },
  {
    n: 2, machine: 'eliptica', previous: 'OPERATIVA', next: 'FUERA_DE_SERVICIO',
    reason: 'Falla en el sistema de resistencia.', changedBy: 'recepcion', createdAt: daysAgo(5),
  },
  {
    n: 3, machine: 'polea', previous: 'OPERATIVA', next: 'EN_MANTENIMIENTO',
    reason: 'Reparación de cable de acero en polea principal.', changedBy: 'admin', createdAt: daysAgo(1),
  },
  {
    n: 4, machine: 'prensa', previous: 'OPERATIVA', next: 'EN_MANTENIMIENTO',
    reason: 'Cambio de tapizado del respaldo.', changedBy: 'admin', createdAt: daysAgo(8),
  },
  {
    n: 5, machine: 'prensa', previous: 'EN_MANTENIMIENTO', next: 'OPERATIVA',
    changedBy: 'admin', createdAt: daysAgo(7),
  },
];

// ---------------------------------------------------------------
// H18 / H19 — Notificaciones
// ---------------------------------------------------------------

interface SeedNotification {
  source: NotificationSource;
  title: string;
  message: string;
  ref?: ClassSessionKey;
}

// 12 notificaciones: 2 páginas de 10; las 7 más recientes sin leer.
const DEMO_NOTIFICATIONS: SeedNotification[] = [
  { source: 'PAGOS', title: 'Cobro pendiente', message: 'Tienes un cobro pendiente de $15.00 por tu sesión personal.' },
  { source: 'CLASES', title: 'Reserva confirmada', message: 'Tu reserva en Yoga Flow fue confirmada.', ref: 'yoga' },
  { source: 'MEMBRESIA', title: 'Membresía por vencer', message: 'Tu membresía Mensual vence en 20 días.' },
  { source: 'EQUIPAMIENTO', title: 'Equipo en mantenimiento', message: 'La Caminadora Pro 3000 está en mantenimiento.' },
  { source: 'CLASES', title: 'Recordatorio de clase', message: 'Tu clase de Spinning comienza en 6 horas.', ref: 'spinning' },
  { source: 'PAGOS', title: 'Pago recibido', message: 'Registramos tu pago del plan Mensual. Comprobante REC-00001.' },
  { source: 'CLASES', title: 'Sesión personal agendada', message: 'Tu sesión con Ana López quedó agendada.' },
  { source: 'EQUIPAMIENTO', title: 'Equipo fuera de servicio', message: 'La Elíptica X200 está fuera de servicio.' },
  { source: 'MEMBRESIA', title: 'Membresía activa', message: 'Tu membresía Mensual ya está activa.' },
  { source: 'CLASES', title: 'Clase cancelada', message: 'La clase de Zumba fue cancelada: instructor no disponible.', ref: 'zumba' },
  { source: 'PAGOS', title: 'Cobro generado', message: 'Se generó el cobro de tu plan Mensual.' },
  { source: 'CLASES', title: 'Reserva cancelada', message: 'Cancelaste tu reserva en Pilates.', ref: 'pilates' },
];

interface SeedOtherNotification extends SeedNotification {
  user: UserKey;
  isRead?: boolean;
}

const OTHER_NOTIFICATIONS: SeedOtherNotification[] = [
  { user: 'clases', source: 'CLASES', title: 'Clase cancelada', message: 'La clase de Zumba fue cancelada.', ref: 'zumba' },
  { user: 'clases', source: 'PAGOS', title: 'Pago recibido', message: 'Registramos tu pago de la sesión personal.', isRead: true },
  { user: 'vencida', source: 'MEMBRESIA', title: 'Membresía vencida', message: 'Tu membresía Mensual venció. Renuévala para volver a reservar.' },
  { user: 'trainer1', source: 'CLASES', title: 'Nueva sesión personal', message: 'Demo agendó una sesión personal contigo.' },
  { user: 'admin', source: 'EQUIPAMIENTO', title: 'Equipo fuera de servicio', message: 'La Elíptica X200 fue marcada fuera de servicio.' },
  { user: 'admin', source: 'PAGOS', title: 'Cobros pendientes', message: 'Hay 12 cobros pendientes por gestionar.', isRead: true },
];

// ---------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------

async function seedUsers(
  passwordHash: string,
): Promise<Record<UserKey, string>> {
  const ids = {} as Record<UserKey, string>;
  for (const key of Object.keys(USERS) as UserKey[]) {
    const user: SeedUser = USERS[key];
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        name: user.name,
        surname: user.surname ?? null,
        role: user.role,
        cardNumber: user.cardNumber,
        isActive: user.isActive ?? true,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname ?? null,
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
    const plan: SeedPlan = PLANS[key];
    const row = await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        type: plan.type,
        price: plan.price,
        durationDays: plan.durationDays ?? null,
        classCount: plan.classCount ?? null,
        benefits: plan.benefits ?? null,
        isActive: plan.isActive ?? true,
      },
      create: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        durationDays: plan.durationDays ?? null,
        classCount: plan.classCount ?? null,
        benefits: plan.benefits ?? null,
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
      status: membership.status ?? 'VIGENTE',
      renewedFromId: membership.renewedFromId ?? null,
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
    const session: SeedClassSession = CLASS_SESSIONS[key];
    const data = {
      name: session.name,
      trainerId: users[session.trainer],
      startsAt: session.startsAt,
      durationMin: session.durationMin,
      capacity: session.capacity,
      status: session.status,
      cancellationReason: session.cancellationReason ?? null,
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
      attendedAt: reservation.attended
        ? CLASS_SESSIONS[reservation.session].startsAt
        : null,
    };
    await prisma.reservation.upsert({
      where: { sessionId_memberId: { sessionId, memberId } },
      update: data,
      create: { id: reservation.id, sessionId, memberId, ...data },
    });
  }
}

async function seedTrainerSlots(
  users: Record<UserKey, string>,
): Promise<Record<TrainerSlotKey, string>> {
  const ids = {} as Record<TrainerSlotKey, string>;
  for (const key of Object.keys(TRAINER_SLOTS) as TrainerSlotKey[]) {
    const slot: SeedTrainerSlot = TRAINER_SLOTS[key];
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
): Promise<Record<PersonalSessionKey, string>> {
  const ids = {} as Record<PersonalSessionKey, string>;
  for (const key of Object.keys(PERSONAL_SESSIONS) as PersonalSessionKey[]) {
    const ps: SeedPersonalSession = PERSONAL_SESSIONS[key];
    const slotId = slots[ps.slot];
    const data = { memberId: users[ps.member], status: ps.status };
    const row = await prisma.personalSession.upsert({
      where: { slotId },
      update: data,
      create: { id: ps.id, slotId, ...data },
    });
    ids[key] = row.id;

    const charge = {
      id: ps.chargeId,
      userId: users[ps.member],
      personalSessionId: row.id,
      amount: PERSONAL_SESSION_PRICE,
      concept: `Sesión personal con ${USERS[ps.trainer].name}`,
    };
    if (ps.status === 'Completada') {
      await seedPaidCharge({ ...charge, paidAt: daysAgo(4), createdAt: daysAgo(5) });
    } else {
      await upsertCharge({ ...charge, status: 'Pendiente', createdAt: daysAgo(1) });
    }
  }
  return ids;
}

async function seedAccessLogs(users: Record<UserKey, string>): Promise<void> {
  for (const log of ACCESS_LOGS) {
    const data = {
      memberId: users[log.member],
      result: log.result,
      registeredById: users[log.registeredBy],
      timestamp: log.timestamp,
    };
    await prisma.accessLog.upsert({
      where: { id: uuid('acce', log.n) },
      update: data,
      create: { id: uuid('acce', log.n), ...data },
    });
  }
}

async function seedRoutines(users: Record<UserKey, string>): Promise<void> {
  const memberId = users[ROUTINE_DEMO.member];
  const routine = await prisma.routine.upsert({
    where: { memberId },
    update: { trainerId: users[ROUTINE_DEMO.trainer], isActive: true },
    create: {
      id: ROUTINE_DEMO.id,
      memberId,
      trainerId: users[ROUTINE_DEMO.trainer],
      isActive: true,
    },
  });
  for (const [index, exercise] of ROUTINE_DEMO.exercises.entries()) {
    const data = { routineId: routine.id, position: index, ...exercise };
    await prisma.exercise.upsert({
      where: { id: uuid('c0de', index + 1) },
      update: data,
      create: { id: uuid('c0de', index + 1), ...data },
    });
  }
}

async function seedProgress(users: Record<UserKey, string>): Promise<void> {
  let markCounter = 0;
  for (const record of PROGRESS) {
    const id = uuid('beef', record.n);
    const data = {
      memberId: users[record.member],
      date: dateAt(-record.daysAgo),
      weight: record.weight,
      waist: record.waist,
      chest: record.chest,
    };
    await prisma.progressRecord.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    for (const mark of record.marks ?? []) {
      markCounter += 1;
      const markData = { progressRecordId: id, ...mark };
      await prisma.strengthMark.upsert({
        where: { id: uuid('face', markCounter) },
        update: markData,
        create: { id: uuid('face', markCounter), ...markData },
      });
    }
  }
}

async function seedMachines(
  users: Record<UserKey, string>,
): Promise<void> {
  const ids = {} as Record<MachineKey, string>;
  for (const key of Object.keys(MACHINES) as MachineKey[]) {
    const machine: SeedMachine = MACHINES[key];
    const data = {
      category: machine.category,
      status: machine.status,
      reason: machine.reason ?? null,
    };
    const row = await prisma.machine.upsert({
      where: { name: machine.name },
      update: data,
      create: { id: machine.id, name: machine.name, ...data },
    });
    ids[key] = row.id;
  }

  // La bitácora es inmutable: nunca se actualiza, solo se crea si falta.
  for (const log of MACHINE_LOGS) {
    await prisma.machineStatusLog.upsert({
      where: { id: uuid('cafe', log.n) },
      update: {},
      create: {
        id: uuid('cafe', log.n),
        machineId: ids[log.machine],
        previousStatus: log.previous,
        newStatus: log.next,
        reason: log.reason ?? null,
        changedById: users[log.changedBy],
        createdAt: log.createdAt,
      },
    });
  }
}

async function seedReviews(
  users: Record<UserKey, string>,
  sessions: Record<ClassSessionKey, string>,
  personalSessions: Record<PersonalSessionKey, string>,
): Promise<void> {
  interface ReviewInput {
    n: number;
    targetType: ReviewTargetType;
    sessionId: string;
    member: UserKey;
    trainer: UserKey;
    rating: number;
    comment?: string;
    createdAt: Date;
  }

  const afterClass = (key: ClassSessionKey, hours: number): Date =>
    new Date(CLASS_SESSIONS[key].startsAt.getTime() + hours * HOUR);

  const reviews: ReviewInput[] = [
    {
      n: 1, targetType: 'CLASE', sessionId: sessions.crossfit, member: 'demo',
      trainer: CLASS_SESSIONS.crossfit.trainer, rating: 5,
      comment: 'Excelente clase, muy dinámica y exigente.',
      createdAt: afterClass('crossfit', 3),
    },
    {
      n: 2, targetType: 'CLASE', sessionId: sessions.crossfit, member: 'clases',
      trainer: CLASS_SESSIONS.crossfit.trainer, rating: 4,
      createdAt: afterClass('crossfit', 5),
    },
    {
      n: 3, targetType: 'CLASE', sessionId: sessions.hiit, member: 'clases',
      trainer: CLASS_SESSIONS.hiit.trainer, rating: 3,
      comment: 'Muy intensa para mi nivel.',
      createdAt: afterClass('hiit', 24),
    },
    {
      n: 4, targetType: 'SESION_PERSONAL', sessionId: personalSessions.clasesCompletada,
      member: 'clases', trainer: PERSONAL_SESSIONS.clasesCompletada.trainer, rating: 5,
      comment: 'Muy buena asesoría, plan claro y realista.',
      createdAt: daysAgo(2),
    },
  ];

  for (const review of reviews) {
    const data = {
      sessionId: review.sessionId,
      targetType: review.targetType,
      memberId: users[review.member],
      trainerId: users[review.trainer],
      rating: review.rating,
      comment: review.comment ?? null,
      createdAt: review.createdAt,
    };
    await prisma.review.upsert({
      where: {
        memberId_sessionId: { memberId: data.memberId, sessionId: data.sessionId },
      },
      update: data,
      create: { id: uuid('add0', review.n), ...data },
    });
  }
}

async function seedNotifications(
  users: Record<UserKey, string>,
  sessions: Record<ClassSessionKey, string>,
): Promise<void> {
  let counter = 0;

  const save = async (
    recipient: UserKey,
    notification: SeedNotification,
    isRead: boolean,
    createdAt: Date,
  ): Promise<void> => {
    counter += 1;
    const data = {
      recipientId: users[recipient],
      title: notification.title,
      message: notification.message,
      sourceModule: notification.source,
      referenceId: notification.ref ? sessions[notification.ref] : null,
      isRead,
      createdAt,
    };
    await prisma.notification.upsert({
      where: { id: uuid('dead', counter) },
      update: data,
      create: { id: uuid('dead', counter), ...data },
    });
  };

  for (const [index, notification] of DEMO_NOTIFICATIONS.entries()) {
    await save('demo', notification, index >= 7, fromNow(-(index + 1) * 3 * HOUR));
  }
  for (const [index, notification] of OTHER_NOTIFICATIONS.entries()) {
    await save(
      notification.user,
      notification,
      notification.isRead ?? false,
      fromNow(-(index + 1) * 2 * HOUR),
    );
  }
}

/** Alinea la secuencia de `receipt_seq` para que el próximo pago real continúe el correlativo. */
async function syncReceiptSequence(): Promise<void> {
  if (lastReceiptSeq === 0) return;
  await prisma.$queryRaw`
    SELECT setval(pg_get_serial_sequence('payments', 'receipt_seq'), ${lastReceiptSeq}::bigint, true)
  `;
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
      activo: (USERS[key] as SeedUser).isActive ?? true,
    })),
  );

  console.log('Membresías');
  console.table([
    { miembro: USERS.demo.email, plan: 'Mensual', estado: 'Vigente' },
    { miembro: USERS.clases.email, plan: 'Clases sueltas', estado: 'Vigente (4 clases restantes)' },
    { miembro: USERS.vencida.email, plan: 'Mensual', estado: 'Vencida (sin renovar)' },
    { miembro: USERS.sinPlan.email, plan: '—', estado: 'Sin membresía' },
    { miembro: USERS.renovo.email, plan: 'Mensual → Trimestral', estado: 'Renovó a los 5 días (cuenta)' },
    { miembro: USERS.tardio.email, plan: 'Mensual → Trimestral', estado: 'Renovó a los 40 días (no cuenta)' },
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

  console.log('Máquinas');
  console.table(
    (Object.keys(MACHINES) as MachineKey[]).map((key) => ({
      máquina: MACHINES[key].name,
      estado: MACHINES[key].status,
      motivo: (MACHINES[key] as SeedMachine).reason ?? '—',
    })),
  );

  console.log(
    'Cobros: %d comprobantes emitidos (REC-00001…REC-%s), 12 pendientes, 1 anulada.',
    lastReceiptSeq,
    String(lastReceiptSeq).padStart(5, '0'),
  );
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const users = await seedUsers(passwordHash);
  const plans = await seedPlans();
  await seedMemberships(users, plans);
  await seedMembershipCharges(users, plans);
  const sessions = await seedClassSessions(users);
  await seedReservations(users, sessions);
  const slots = await seedTrainerSlots(users);
  const personalSessions = await seedPersonalSessions(users, slots);
  await seedExtraCharges(users, plans);
  await seedAccessLogs(users);
  await seedRoutines(users);
  await seedProgress(users);
  await seedMachines(users);
  await seedReviews(users, sessions, personalSessions);
  await seedNotifications(users, sessions);
  await syncReceiptSequence();

  printSummary();
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}