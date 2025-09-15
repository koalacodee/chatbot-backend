export class TaskCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignmentType:
      | 'INDIVIDUAL'
      | 'DEPARTMENT'
      | 'SUB_DEPARTMENT',
    public readonly assignedEmployeeId?: string,
    public readonly targetDepartmentId?: string,
    public readonly targetSubDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
