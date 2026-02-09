import { TaskAssignmentType } from '../entities/task.entity';

export class TaskDelegationCreatedEvent {
  constructor(
    public readonly delegationId: string,
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignmentType: TaskAssignmentType,
    public readonly delegatorId: string,
    public readonly assignedEmployeeId?: string,
    public readonly targetSubDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
