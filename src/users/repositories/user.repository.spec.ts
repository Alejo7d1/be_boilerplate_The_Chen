import { Prisma } from '@PrismaClient';
import type { PrismaService } from '@Prisma/services';
import { EmailAlreadyTakenError } from '@Users/errors';
import { UserRepository } from '@Users/repositories';

const EMAIL = 'miembro@test.com';
const USER = {
  id: 'user-1',
  email: EMAIL,
  name: 'Miembro',
  passwordHash: 'hash',
  role: 'MIEMBRO',
  cardNumber: 'MEM-2026-0001',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  surname: null,
};

/**
 * `P2002` tal como lo entrega el driver adapter de Prisma 7: sin
 * `meta.target`, con el índice violado dentro de `driverAdapterError.cause`.
 */
function adapterUniqueViolation(index: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.10.0',
    meta: {
      modelName: 'User',
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: {
          originalCode: '23505',
          originalMessage: `duplicate key value violates unique constraint "${index}"`,
          constraint: { index },
          table: 'users',
        },
      },
    },
  } as never);
}

/** `P2002` del motor clásico: el índice en `meta.target`. */
function engineUniqueViolation(index: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '7.10.0',
    meta: { modelName: 'User', target: [index] },
  });
}

function createRepository(create: ReturnType<typeof vi.fn>) {
  const prisma = { user: { create } } as unknown as PrismaService;
  return new UserRepository(prisma);
}

describe('UserRepository.create', () => {
  it('reintenta cuando colisiona el carné (driver adapter)', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(adapterUniqueViolation('users_card_number_key'))
      .mockResolvedValueOnce(USER);

    const user = await createRepository(create).create({
      email: EMAIL,
      name: 'Miembro',
      passwordHash: 'hash',
    });

    expect(user).toBe(USER);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('reintenta cuando colisiona el carné (motor clásico)', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(engineUniqueViolation('users_card_number_key'))
      .mockResolvedValueOnce(USER);

    await createRepository(create).create({
      email: EMAIL,
      name: 'Miembro',
      passwordHash: 'hash',
    });

    expect(create).toHaveBeenCalledTimes(2);
  });

  it('traduce la colisión de email a EmailAlreadyTakenError sin reintentar', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(adapterUniqueViolation('users_email_key'));

    await expect(
      createRepository(create).create({
        email: EMAIL,
        name: 'Miembro',
        passwordHash: 'hash',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyTakenError);

    expect(create).toHaveBeenCalledTimes(1);
  });
});
