export class ReservationNotFoundError extends Error {
  constructor(public readonly reservationId: string) {
    super(`Reservation ${reservationId} not found`);
  }
}

export class ReservationAlreadyCancelledError extends Error {
  constructor(public readonly reservationId: string) {
    super(`Reservation ${reservationId} is already cancelled`);
  }
}

export class CancellationWindowClosedError extends Error {
  constructor(public readonly reservationId: string) {
    super(`Reservation ${reservationId} starts in less than two hours`);
  }
}
