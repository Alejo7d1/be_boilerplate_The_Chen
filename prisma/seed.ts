import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole, PlanType, MembershipStatus, ChargeStatus, } from '../src/generated/prisma/enums.js';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando el proceso de seed de la base de datos...');

  // Limpiar datos existentes en orden seguro (respetando llaves foráneas)
  await prisma.reservation.deleteMany(); 
  await prisma.classSession.deleteMany(); 
  await prisma.charge.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123*', 10);

  // 1. Crear Usuarios Base (Definidos en las reglas del proyecto)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@thechen.com',
      passwordHash: hashedPassword,
      role: UserRole.RECEPCION_ADMIN,
      name: 'Administrador',
      surname: 'General',
      cardNumber: 'ADM-2026-0001',
      isActive: true,
    },
  });

  const recepcion = await prisma.user.create({
    data: {
      email: 'recepcion@thechen.com',
      passwordHash: hashedPassword,
      role: UserRole.RECEPCION_ADMIN,
      name: 'Personal',
      surname: 'Recepción',
      cardNumber: 'REC-2026-0002',
      isActive: true,
    },
  });

  const entrenador = await prisma.user.create({
    data: {
      email: 'entrenador@thechen.com',
      passwordHash: hashedPassword,
      role: UserRole.ENTRENADOR,
      name: 'Carlos',
      surname: 'Entrenador',
      cardNumber: 'TRN-2026-0003',
      isActive: true,
    },
  });

  const miembroActivo = await prisma.user.create({
    data: {
      email: 'miembro.activo@thechen.com',
      passwordHash: hashedPassword,
      role: UserRole.MIEMBRO,
      name: 'Steven',
      surname: 'Chen',
      cardNumber: 'MEM-2026-0042',
      isActive: true,
    },
  });

  const miembroVencido = await prisma.user.create({
    data: {
      email: 'miembro.vencido@thechen.com',
      passwordHash: hashedPassword,
      role: UserRole.MIEMBRO,
      name: 'Juan',
      surname: 'Pérez',
      cardNumber: 'MEM-2026-0099',
      isActive: true,
    },
  });

  console.log('👥 Usuarios base creados exitosamente.');

  // 2. Crear Planes Comerciales
  const planMensual = await prisma.plan.create({
    data: {
      name: 'Plan Mensual General',
      type: PlanType.MENSUAL,
      price: 35.00,
      durationDays: 30,
      benefits: 'Acceso ilimitado a instalaciones y clases grupales en horario general.',
      isActive: true,
    },
  });

  const planTrimestral = await prisma.plan.create({
    data: {
      name: 'Plan Trimestral Pro',
      type: PlanType.TRIMESTRAL,
      price: 90.00,
      durationDays: 90,
      benefits: 'Acceso ilimitado por 3 meses + 1 sesión de evaluación corporal gratis.',
      isActive: true,
    },
  });

  const planClases = await prisma.plan.create({
    data: {
      name: 'Paquete 10 Clases Sueltas',
      type: PlanType.CLASES_SUELTAS,
      price: 25.00,
      classCount: 10,
      benefits: 'Bono de 10 accesos a clases grupales sin caducidad mensual rígida.',
      isActive: true,
    },
  });

  console.log('🏋️ Planes comerciales creados exitosamente.');

  // 3. Crear Membresías y Cobros de Prueba (H1 & H2)
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + 30);

  const pastDateStart = new Date();
  pastDateStart.setDate(now.getDate() - 60);
  const pastDateEnd = new Date();
  pastDateEnd.setDate(now.getDate() - 30);

  // Membresía Vigente para el miembro activo
  const membresiaActiva = await prisma.membership.create({
    data: {
      userId: miembroActivo.id,
      planId: planMensual.id,
      status: MembershipStatus.VIGENTE,
      startDate: now,
      endDate: futureDate,
    },
  });

  // Cobro pagado asociado a la membresía activa
  await prisma.charge.create({
    data: {
      userId: miembroActivo.id,
      planId: planMensual.id,
      membershipId: membresiaActiva.id,
      amount: 35.00,
      status: ChargeStatus.PAGADO,
      receiptNumber: 'REC-00001',
      concept: 'Compra Plan Mensual General',
      last4: '4242',
      paidAt: now,
    },
  });

  // Membresía Vencida para el miembro vencido (con un cobro pendiente de renovación)
  const membresiaVencida = await prisma.membership.create({
    data: {
      userId: miembroVencido.id,
      planId: planMensual.id,
      status: MembershipStatus.VENCIDA,
      startDate: pastDateStart,
      endDate: pastDateEnd,
    },
  });

  // Cobro pendiente de renovación simulando lo que genera la H2
  await prisma.charge.create({
    data: {
      userId: miembroVencido.id,
      planId: planMensual.id,
      membershipId: membresiaVencida.id,
      amount: 35.00,
      status: ChargeStatus.PENDIENTE,
      concept: 'Renovación Plan Mensual General',
    },
  });

  console.log('💳 Membresías y cobros de prueba inicializados correctamente.');

  // 4. Crear Sesiones de Clases Grupales de Prueba (H4 - DB-4.1) 
  const todaySessionDate = new Date();
  todaySessionDate.setHours(9, 0, 0, 0);

  const tomorrowSessionDate = new Date();
  tomorrowSessionDate.setDate(todaySessionDate.getDate() + 1);
  tomorrowSessionDate.setHours(18, 0, 0, 0);

  await prisma.classSession.create({
    data: {
      name: 'Yoga Flow Matutino',
      trainerId: entrenador.id,
      date: todaySessionDate,
      startTime: '09:00',
      duration: 60,
      maxCapacity: 2, // Bajo para probar fácil el sobrecupo y concurrencia (H4)
      isActive: true,
    },
  });

  await prisma.classSession.create({
    data: {
      name: 'CrossFit Avanzado',
      trainerId: entrenador.id,
      date: tomorrowSessionDate,
      startTime: '18:00',
      duration: 60,
      maxCapacity: 15,
      isActive: true,
    },
  });

  console.log('🧘 Sesiones de clases grupales de prueba creadas exitosamente.');
  console.log('✨ Seed completado con éxito.');

  // 5. Crear una reserva activa de prueba para el miembro activo (H4 / H5)
  const sesionYoga = await prisma.classSession.findFirst({
    where: { name: 'Yoga Flow Matutino' },
  });

  if (sesionYoga) {
    await prisma.reservation.create({
      data: {
        sessionId: sesionYoga.id,
        memberId: miembroActivo.id,
        status: 'ACTIVA',
      },
    });
    console.log('🎟️ Reserva de prueba creada para el miembro activo.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });