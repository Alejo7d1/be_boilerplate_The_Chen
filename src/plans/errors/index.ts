export class PlanNameTakenError extends Error {
  constructor(public readonly name: string) {
    super(`Plan name ${name} is already in use`);
  }
}
