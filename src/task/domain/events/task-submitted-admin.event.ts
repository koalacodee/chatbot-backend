export class TaskSubmittedAdminEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly submittedAt: Date = new Date(),
  ) {}
}
