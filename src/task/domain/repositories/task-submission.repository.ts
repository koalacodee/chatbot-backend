import { TaskSubmission } from '../entities/task-submission.entity';

export abstract class TaskSubmissionRepository {
  abstract save(taskSubmission: TaskSubmission): Promise<TaskSubmission>;
  abstract findById(id: string): Promise<TaskSubmission | null>;
  abstract findByTaskId(taskId: string): Promise<TaskSubmission[]>;
  abstract findByPerformerId(performerId: string): Promise<TaskSubmission[]>;
  abstract findByStatus(status: string): Promise<TaskSubmission[]>;
  abstract findAll(): Promise<TaskSubmission[]>;
  abstract delete(id: string): Promise<void>;
  abstract findByTaskIds(taskIds: string[]): Promise<TaskSubmission[]>;
}
