export class TaskRejectedEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignedEmployeeId: string,
    public readonly rejectedAt: Date = new Date(),
  ) {}
}
