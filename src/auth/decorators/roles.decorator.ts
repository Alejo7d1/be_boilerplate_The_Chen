import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@PrismaClient';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados.
 *
 * El guard de JWT sigue siendo global y autentica primero; este decorador solo
 * añade la autorización por rol. Si no se declara, la ruta queda disponible
 * para cualquier usuario autenticado.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
