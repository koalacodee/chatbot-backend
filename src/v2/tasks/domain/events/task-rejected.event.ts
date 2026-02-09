export class TaskRejectedEvent {
  constructor(
    public readonly taskId: string,
    public readonly taskTitle: string,
    public readonly assigneeUserId: string | undefined, // Original assignee
    public readonly performerUserId: string, // Person who submitted
    public readonly rejectedAt: Date,
    public readonly feedback?: string,
  ) {}
}
