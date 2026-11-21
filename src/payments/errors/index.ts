/** Errores de negocio del cobro, traducidos a HTTP en el servicio. */

export class ChargeNotFoundError extends Error {
  constructor(chargeId: string) {
    super(`El cobro ${chargeId} no existe`);
    this.name = 'ChargeNotFoundError';
  }
}

export class ChargeAlreadyPaidError extends Error {
  constructor(chargeId: string) {
    super(`El cobro ${chargeId} ya fue pagado`);
    this.name = 'ChargeAlreadyPaidError';
  }
}

export class ChargeCancelledError extends Error {
  constructor(chargeId: string) {
    super(`El cobro ${chargeId} fue anulado`);
    this.name = 'ChargeCancelledError';
  }
}
