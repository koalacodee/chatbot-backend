import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import type { TaskDelegationSubmission } from '@/v2/tasks/domain/entities/task-delegation-submission.entity';
import type { TaskDelegationSubmissionRepository } from '@/v2/tasks/domain/repositories/task-delegation-submission.repository';
import * as crud from './repository-crud';
import * as find from './repository-find';

export class DrizzleTaskDelegationSubmissionRepository
  implements TaskDelegationSubmissionRepository
{
  constructor(private readonly db: DatabaseInstance | DrizzleTransaction) {}

  static fromTransaction(
    tx: DrizzleTransaction,
  ): DrizzleTaskDelegationSubmissionRepository {
    return new DrizzleTaskDelegationSubmissionRepository(tx);
  }

  async save(
    submission: TaskDelegationSubmission,
  ): Promise<TaskDelegationSubmission> {
    return crud.save(this.db, submission);
  }

  async findById(id: string): Promise<TaskDelegationSubmission | null> {
    return crud.findById(this.db, id);
  }

  async findByDelegationId(
    delegationId: string,
  ): Promise<TaskDelegationSubmission[]> {
    return find.findByDelegationId(this.db, delegationId);
  }

  async findByDelegationIds(
    delegationIds: string[],
  ): Promise<TaskDelegationSubmission[]> {
    return find.findByDelegationIds(this.db, delegationIds);
  }

  async findByPerformerId(
    performerId: string,
  ): Promise<TaskDelegationSubmission[]> {
    return find.findByPerformerId(this.db, performerId);
  }

  async findByStatus(status: string): Promise<TaskDelegationSubmission[]> {
    return find.findByStatus(this.db, status);
  }

  async findAll(): Promise<TaskDelegationSubmission[]> {
    return find.findAll(this.db);
  }

  async delete(id: string): Promise<void> {
    return crud.deleteById(this.db, id);
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    return crud.deleteByTaskId(this.db, taskId);
  }

  async findByTaskId(
    taskId: string,
    forwardedOnly?: boolean,
    status?: string | string[],
  ): Promise<TaskDelegationSubmission[]> {
    return find.findByTaskId(this.db, taskId, forwardedOnly, status);
  }

  async findByTaskIds(
    taskIds: string[],
    forwardedOnly?: boolean,
  ): Promise<TaskDelegationSubmission[]> {
    return find.findByTaskIds(this.db, taskIds, forwardedOnly);
  }
}
