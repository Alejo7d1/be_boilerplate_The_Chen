import { Prisma } from '@PrismaClient';
import { describe, expect, it, vi } from 'vitest';
import { EmailAlreadyTakenError } from '@Users/errors';
import { UserRepository } from './user.repository.js';
import type { PrismaService } from '@Prisma/services';

/**
 * Regresión: en Prisma 7 el `meta` de un P2002 no trae `target`; el nombre de
 * la restricción viene en `meta.driverAdapterError.constraint.index`. Cuando no
 * se detectaba el carné, una colisión se reportaba como "email ya registrado".
 */
function p2002(constraintName: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the constraint: \`${constraintName}\``,
    {
      code: 'P2002',
      clientVersion: '7.10.0',
      meta: {
        modelName: 'User',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { index: constraintName },
            table: 'users',
          },
        },
      },
    },
  );
}

const CREATED_USER = { id: 'user-1', email: 'ana@example.com' };

function repositoryWithCreate(create: ReturnType<typeof vi.fn>) {
  const prisma = { user: { create } } as unknown as PrismaService;
  return new UserRepository(prisma);
}

const DATA = {
  email: 'ana@example.com',
  name: 'Ana',
  passwordHash: 'hash',
};

describe('UserRepository.create', () => {
  it('reintenta cuando colisiona el carné', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(p2002('users_card_number_key'))
      .mockResolvedValueOnce(CREATED_USER);

    await expect(repositoryWithCreate(create).create(DATA)).resolves.toBe(
      CREATED_USER,
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('no reintenta cuando el email ya existe', async () => {
    const create = vi.fn().mockRejectedValue(p2002('users_email_key'));

    await expect(repositoryWithCreate(create).create(DATA)).rejects.toBeInstanceOf(
      EmailAlreadyTakenError,
    );
    expect(create).toHaveBeenCalledTimes(1);
  });
});
