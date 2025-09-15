export class TaskApprovedEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignedEmployeeId?: string,
    public readonly performerEmployeeId?: string,
    public readonly approvedAt: Date = new Date(),
  ) {}
}
