export class MemberNotFoundError extends Error {
  constructor(public readonly memberId: string) {
    super(`Member ${memberId} not found`);
  }
}

export class NotAMemberError extends Error {
  constructor(public readonly userId: string) {
    super(`User ${userId} does not have the MIEMBRO role`);
  }
}

export class PlanNotFoundError extends Error {
  constructor(public readonly planId: string) {
    super(`Plan ${planId} not found`);
  }
}

export class InactivePlanError extends Error {
  constructor(public readonly planId: string) {
    super(`Plan ${planId} is not active`);
  }
}

export class DuplicatePurchaseError extends Error {
  constructor(public readonly memberId: string) {
    super(`A purchase for member ${memberId} was just registered`);
  }
}
