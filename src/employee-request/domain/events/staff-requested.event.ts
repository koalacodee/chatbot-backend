export class TaskPerformedEvent {
  constructor(
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly newEmployeeFullName: string,
  ) {}
}
