export class TaskSubmittedSupervisorEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignedEmployeeId: string,
    public readonly supervisorId: string,
    public readonly submittedAt: Date = new Date(),
  ) {}
}
