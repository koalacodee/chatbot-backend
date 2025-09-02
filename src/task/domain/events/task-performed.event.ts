import { TaskStatus } from '../entities/task.entity';

export class TaskPerformedEvent {
  constructor(
    public readonly title: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly departmentId: string,
    public readonly status: TaskStatus,
  ) {}
}
