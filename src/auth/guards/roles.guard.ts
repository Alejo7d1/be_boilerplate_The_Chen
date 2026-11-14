import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { RequestWithUser } from '../decorators/current-user.decorator.js';
import type { UserRole } from '@PrismaClient';

/**
 * Autoriza por rol después de que JwtAuthGuard cargó el usuario en el request.
 *
 * Sin `@Roles(...)` la ruta no exige rol adicional: el guard es deliberadamente
 * permisivo para no duplicar la lista de roles en rutas solo autenticadas.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción',
      );
    }
    return true;
  }
}
