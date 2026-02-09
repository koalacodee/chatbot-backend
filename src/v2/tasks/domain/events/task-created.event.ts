import { TaskAssignmentType } from '../entities/task.entity';

export class TaskCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly title: string,
    public readonly assignmentType: TaskAssignmentType,
    public readonly assigneeId?: string,
    public readonly targetDepartmentId?: string,
    public readonly targetSubDepartmentId?: string,
    public readonly createdAt: Date = new Date(),
  ) {}
}
