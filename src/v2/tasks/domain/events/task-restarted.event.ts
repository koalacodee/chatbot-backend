export class TaskRestartedEvent {
  constructor(
    public readonly taskId: string,
    public readonly restartedByUserId: string,
    public readonly occurredAt: Date,
  ) {}
}
