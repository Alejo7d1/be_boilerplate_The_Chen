import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DEFAULT_PASSWORD = 'Demo1234!';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  console.log('🌱 Iniciando carga de datos de prueba (Seed oficial The Chen)...');

  // 1. Crear Planes Comerciales base
  const planMensual = await prisma.plan.upsert({
    where: { name: 'Plan Mensual' },
    update: {},
    create: {
      name: 'Plan Mensual',
      type: 'MENSUAL',
      price: 35.00,
      durationDays: 30,
      benefits: 'Acceso ilimitado a instalaciones y clases grupales.',
    },
  });

  // 2. Crear Usuarios Base según la Sección 1.3 del documento
  
  // Administrador
  await prisma.user.upsert({
    where: { email: 'admin@thechen.com' },
    update: {},
    create: {
      email: 'admin@thechen.com',
      passwordHash,
      role: 'RECEPCION_ADMIN',
      name: 'Admin',
      surname: 'General',
    },
  });

  // Recepción
  await prisma.user.upsert({
    where: { email: 'recepcion@thechen.com' },
    update: {},
    create: {
      email: 'recepcion@thechen.com',
      passwordHash,
      role: 'RECEPCION_ADMIN',
      name: 'Personal',
      surname: 'Recepción',
    },
  });

  // Entrenador
  await prisma.user.upsert({
    where: { email: 'entrenador@thechen.com' },
    update: {},
    create: {
      email: 'entrenador@thechen.com',
      passwordHash,
      role: 'ENTRENADOR',
      name: 'Carlos',
      surname: 'Mendoza',
    },
  });

  // Miembro Activo
  const activeMember = await prisma.user.upsert({
    where: { email: 'miembro.activo@thechen.com' },
    update: {},
    create: {
      email: 'miembro.activo@thechen.com',
      passwordHash,
      role: 'MIEMBRO',
      name: 'Steven',
      surname: 'Chen',
      cardNumber: 'MEM-2026-0042',
    },
  });

  const existingActiveMembership = await prisma.membership.findFirst({
    where: { userId: activeMember.id },
  });

  if (!existingActiveMembership) {
    const futureEndDate = new Date();
    futureEndDate.setDate(futureEndDate.getDate() + 20);

    await prisma.membership.create({
      data: {
        userId: activeMember.id,
        planId: planMensual.id,
        startDate: new Date(),
        endDate: futureEndDate,
      },
    });
  }

  // Miembro Vencido
  const expiredMember = await prisma.user.upsert({
    where: { email: 'miembro.vencido@thechen.com' },
    update: {},
    create: {
      email: 'miembro.vencido@thechen.com',
      passwordHash,
      role: 'MIEMBRO',
      name: 'Ana',
      surname: 'Gómez',
      cardNumber: 'MEM-2026-0099',
    },
  });

  const existingExpiredMembership = await prisma.membership.findFirst({
    where: { userId: expiredMember.id },
  });

  if (!existingExpiredMembership) {
    const pastStartDate = new Date();
    pastStartDate.setDate(pastStartDate.getDate() - 40);
    const pastEndDate = new Date();
    pastEndDate.setDate(pastEndDate.getDate() - 10);

    await prisma.membership.create({
      data: {
        userId: expiredMember.id,
        planId: planMensual.id,
        startDate: pastStartDate,
        endDate: pastEndDate,
      },
    });
  }

  console.log('✅ Seed completado con éxito y adaptado a las reglas del proyecto.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}