// Errores de dominio: los lanza el repositorio y los traduce el servicio a HTTP.
export class SessionNotFoundError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Class session ${sessionId} not found`);
  }
}
export class SessionNotScheduledError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Class session ${sessionId} is not scheduled`);
  }
}
export class SessionFullError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Class session ${sessionId} has no spots left`);
  }
}
export class AlreadyReservedError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Member already has an active reservation in ${sessionId}`);
  }
}
