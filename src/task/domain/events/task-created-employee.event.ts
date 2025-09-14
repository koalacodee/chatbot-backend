export class TaskCreatedEmployeeEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignedEmployeeId?: string,
    public readonly assignedSubDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
