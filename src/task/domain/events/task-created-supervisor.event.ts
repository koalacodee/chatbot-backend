export class TaskCreatedSupervisorEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly categoryId: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
