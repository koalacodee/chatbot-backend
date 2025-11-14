export class TaskDelegationCreatedEvent {
  constructor(
    public readonly delegationId: string,
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignmentType:
      | 'INDIVIDUAL'
      | 'DEPARTMENT'
      | 'SUB_DEPARTMENT',
    public readonly delegatorId: string,
    public readonly assignedEmployeeId?: string,
    public readonly targetSubDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) { }
}

