export class SlotNotFoundError extends Error {
  constructor(public readonly slotId: string) {
    super(`Availability slot ${slotId} not found`);
  }
}

export class SlotAlreadyBookedError extends Error {
  constructor(public readonly slotId: string) {
    super(`Availability slot ${slotId} is already booked`);
  }
}

export class MembershipInactiveError extends Error {
  constructor(public readonly memberId: string) {
    super(`Member ${memberId} does not have an active membership`);
  }
}
