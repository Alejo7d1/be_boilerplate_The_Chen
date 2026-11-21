import type { UserRole } from '@PrismaClient';

/** Payload que viaja dentro del JWT de acceso. */
export interface AccessTokenPayload {
  /** ID del usuario (claim estándar `sub`). */
  sub: string;
  email: string;
  /**
   * Rol del usuario, para que el frontend pueda decidir qué mostrar sin una
   * llamada extra a `/auth/me`. La autorización real NO depende de este claim:
   * `RolesGuard` lee el rol de la fila recargada en cada request.
   */
  role: UserRole;
}

/** Par de tokens devuelto por login y refresh. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Vigencia del access token, en segundos. */
  expiresIn: number;
}
