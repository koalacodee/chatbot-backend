import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import type { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import type {
  Delegable,
  TaskDelegationRepository,
} from '@/v2/tasks/domain/repositories/task-delegation.repository';
import * as crud from './repository-crud';
import * as find from './repository-find';
import {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';

export class DrizzleTaskDelegationRepository
  implements TaskDelegationRepository
{
  constructor(private readonly db: DatabaseInstance | DrizzleTransaction) {}

  static fromTransaction(
    tx: DrizzleTransaction,
  ): DrizzleTaskDelegationRepository {
    return new DrizzleTaskDelegationRepository(tx);
  }

  async save(taskDelegation: TaskDelegation): Promise<TaskDelegation> {
    return crud.save(this.db, taskDelegation);
  }

  async update(
    id: string,
    updates: Partial<TaskDelegation>,
  ): Promise<TaskDelegation> {
    return crud.update(this.db, id, updates);
  }

  async findById(id: string): Promise<TaskDelegation | null> {
    return crud.findById(this.db, id);
  }

  async findByIds(ids: string[]): Promise<TaskDelegation[]> {
    return crud.findByIds(this.db, ids);
  }

  async findAll(): Promise<TaskDelegation[]> {
    return crud.findAll(this.db);
  }

  async removeById(id: string): Promise<TaskDelegation | null> {
    return crud.removeById(this.db, id);
  }

  async removeByIds(ids: string[]): Promise<TaskDelegation[]> {
    return crud.removeByIds(this.db, ids);
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    return crud.deleteByTaskId(this.db, taskId);
  }

  async exists(id: string): Promise<boolean> {
    return crud.exists(this.db, id);
  }

  async count(): Promise<number> {
    return crud.count(this.db);
  }

  async findByTaskId(taskId: string): Promise<TaskDelegation[]> {
    return find.findByTaskId(this.db, taskId);
  }

  async findByTaskIds(taskIds: string[]): Promise<TaskDelegation[]> {
    return find.findByTaskIds(this.db, taskIds);
  }

  async findByAssigneeId(assigneeId: string): Promise<TaskDelegation[]> {
    return find.findByAssigneeId(this.db, assigneeId);
  }

  async findByAssigneeIds(assigneeIds: string[]): Promise<TaskDelegation[]> {
    return find.findByAssigneeIds(this.db, assigneeIds);
  }

  async findByTargetSubDepartmentId(
    targetSubDepartmentId: string,
  ): Promise<TaskDelegation[]> {
    return find.findByTargetSubDepartmentId(this.db, targetSubDepartmentId);
  }

  async findByTargetSubDepartmentIds(
    targetSubDepartmentIds: string[],
  ): Promise<TaskDelegation[]> {
    return find.findByTargetSubDepartmentIds(this.db, targetSubDepartmentIds);
  }

  async findByDelegatorId(delegatorId: string): Promise<TaskDelegation[]> {
    return find.findByDelegatorId(this.db, delegatorId);
  }

  async findByDelegatorIdWithFilters(options: {
    delegatorId: string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ delegations: TaskDelegation[]; total: number }> {
    return find.findByDelegatorIdWithFilters(this.db, options);
  }

  async findMyDelegationsForSupervisor(options: {
    delegator:
      | { delegatorId: string; delegatorUserId: never }
      | { delegatorUserId: string; delegatorId: never };
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<TaskDelegation>> {
    return find.findMyDelegationsForSupervisor(this.db, options);
  }

  async findMyDelegationsForEmployee(options: {
    assignee:
      | { assigneeId: string; assigneeUserId: never }
      | { assigneeUserId: string; assigneeId: never };
    subDepartmentIds: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<TaskDelegation>> {
    return find.findMyDelegationsForEmployee(this.db, options);
  }

  async findBySubDepartment(
    subDepartmentId: string,
    options?: {
      cursor?: CursorInput;
      status?: string[];
    },
  ): Promise<PaginatedArrayResult<TaskDelegation>> {
    return find.findBySubDepartment(this.db, subDepartmentId, options);
  }

  async findByTask(
    taskId: string,
    options?: {
      cursor?: CursorInput;
      status?: string[];
    },
  ): Promise<PaginatedArrayResult<TaskDelegation>> {
    return find.findByTask(this.db, taskId, options);
  }

  findDelegablesForSupervisor(
    supervisor:
      | { supervisorId: string; supervisorUserId: never }
      | { supervisorUserId: string; supervisorId: never },
    search?: string,
  ): Promise<Delegable[]> {
    return find.findDelegablesForSupervisor(this.db, supervisor, search);
  }
}
