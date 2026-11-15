import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '@Prisma/services';
import { EmailAlreadyTakenError } from '@Users/errors';
import { Prisma, UserRole, type User } from '@PrismaClient';

/** Código de Prisma para violación de restricción única. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const CARD_NUMBER_ATTEMPTS = 12;

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRole;
}

export interface FindUsersFilters {
  role?: UserRole;
  search?: string;
}

/**
 * Único punto del módulo que habla con la tabla `users`.
 *
 * Los servicios no conocen Prisma: reciben y devuelven entidades, y los
 * detalles del ORM (códigos de error, formas de `where`, `select`) quedan
 * encapsulados acá. Eso permite cambiar el acceso a datos sin tocar la lógica
 * de negocio, y testear los servicios con un doble de este repositorio.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @throws {EmailAlreadyTakenError} si el email ya está registrado.
   *
   * Se deja que la base decida la unicidad en vez de consultar antes: un
   * `findUnique` previo tiene una condición de carrera entre la lectura y el
   * insert. El código P2002 de Prisma se traduce a un error de dominio para
   * que la capa de servicio no tenga que conocer los códigos del ORM.
   */
  async create({
    email,
    name,
    passwordHash,
    role = UserRole.MIEMBRO,
  }: CreateUserData): Promise<User> {
    const normalizedEmail = this.normalizeEmail(email);

    for (let attempt = 0; attempt < CARD_NUMBER_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            name,
            passwordHash,
            role,
            cardNumber: this.nextCardNumber(role),
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_CONSTRAINT_VIOLATION
        ) {
          // Una colisión de carné se resuelve reintentando; la de email no.
          if (!this.isCardNumberConflict(error)) {
            throw new EmailAlreadyTakenError(email);
          }
          continue;
        }
        throw error;
      }
    }

    throw new Error('No se pudo generar un número de carné único');
  }

  /**
   * Miembros y personal comparten patrón, pero cada rol lleva su propio
   * prefijo para que el carné sea identificable a simple vista.
   */
  private nextCardNumber(role: UserRole): string {
    const prefix = role === UserRole.MIEMBRO ? 'MEM' : 'EMP';
    const year = new Date().getFullYear();
    // Aleatorio en vez de correlativo: dos altas concurrentes no pueden
    // calcular el mismo "siguiente" número. La colisión se reintenta.
    const suffix = String(randomInt(1, 10_000)).padStart(4, '0');
    return `${prefix}-${year}-${suffix}`;
  }

  private isCardNumberConflict(
    error: Prisma.PrismaClientKnownRequestError,
  ): boolean {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.join(',')
      : typeof target === 'string'
        ? target
        : JSON.stringify(target ?? '');
    return fields.includes('card_number');
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findMany({ role, search }: FindUsersFilters): Promise<User[]> {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(role ? { role } : {}),
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { cardNumber: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.prisma.user
      .count({ where: { email: this.normalizeEmail(email) } })
      .then((count) => count > 0);
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  setActive(id: string, isActive: boolean): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  deleteById(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  /**
   * Los emails se persisten y se consultan en minúsculas.
   *
   * El índice único de Postgres es sensible a mayúsculas, así que sin esto
   * "Demo@mail.com" y "demo@mail.com" serían dos cuentas distintas y el login
   * fallaría según cómo el usuario escribiera su email. Va en el repositorio a
   * propósito: es el único punto por el que pasan todas las lecturas y
   * escrituras, así que ningún llamador puede saltearse la normalización.
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
