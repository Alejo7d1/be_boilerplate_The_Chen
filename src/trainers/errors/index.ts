export class TrainerNotFoundError extends Error {
  constructor(public readonly trainerId: string) {
    super(`Trainer ${trainerId} not found`);
  }
}

export class SlotNotFoundError extends Error {
  constructor(public readonly slotId: string) {
    super(`Availability slot ${slotId} not found`);
  }
}

export class SlotOverlapError extends Error {
  constructor(public readonly trainerId: string) {
    super(`Trainer ${trainerId} already has a slot in that time range`);
  }
}

export class SlotBookedError extends Error {
  constructor(public readonly slotId: string) {
    super(`Availability slot ${slotId} is already booked`);
  }
}

export class InvalidSlotError extends Error {
  constructor(message: string) {
    super(message);
  }
}
