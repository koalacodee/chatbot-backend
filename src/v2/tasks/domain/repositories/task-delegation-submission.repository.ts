import type { TaskDelegationSubmission } from '../entities/task-delegation-submission.entity';

export abstract class TaskDelegationSubmissionRepository {
  abstract save(
    submission: TaskDelegationSubmission,
  ): Promise<TaskDelegationSubmission>;
  abstract findById(id: string): Promise<TaskDelegationSubmission | null>;
  abstract findByDelegationId(
    delegationId: string,
  ): Promise<TaskDelegationSubmission[]>;
  abstract findByDelegationIds(
    delegationIds: string[],
  ): Promise<TaskDelegationSubmission[]>;
  abstract findByPerformerId(
    performerId: string,
  ): Promise<TaskDelegationSubmission[]>;
  abstract findByStatus(status: string): Promise<TaskDelegationSubmission[]>;
  abstract findAll(): Promise<TaskDelegationSubmission[]>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByTaskId(taskId: string): Promise<void>;
  abstract findByTaskId(
    taskId: string,
    forwardedOnly?: boolean,
    status?: string | string[],
  ): Promise<TaskDelegationSubmission[]>;
  abstract findByTaskIds(
    taskIds: string[],
    forwardedOnly?: boolean,
  ): Promise<TaskDelegationSubmission[]>;
}
