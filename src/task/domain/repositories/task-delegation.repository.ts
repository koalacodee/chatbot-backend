import { TaskDelegation } from "../entities/task-delegation.entity";

export abstract class TaskDelegationRepository {
  abstract save(taskDelegation: TaskDelegation): Promise<TaskDelegation>;
  abstract update(id: string, updates: Partial<TaskDelegation>): Promise<TaskDelegation>;
  abstract findById(id: string): Promise<TaskDelegation | null>;
  abstract findByIds(ids: string[]): Promise<TaskDelegation[]>;
  abstract findAll(): Promise<TaskDelegation[]>;
  abstract removeById(id: string): Promise<TaskDelegation | null>;
  abstract removeByIds(ids: string[]): Promise<TaskDelegation[]>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByTaskId(taskId: string): Promise<TaskDelegation[]>;
  abstract findByTaskIds(taskIds: string[]): Promise<TaskDelegation[]>;
  abstract findByAssigneeId(assigneeId: string): Promise<TaskDelegation[]>;
  abstract findByAssigneeIds(assigneeIds: string[]): Promise<TaskDelegation[]>;
  abstract findByTargetSubDepartmentId(targetSubDepartmentId: string): Promise<TaskDelegation[]>;
  abstract findByTargetSubDepartmentIds(targetSubDepartmentIds: string[]): Promise<TaskDelegation[]>;
  abstract findByDelegatorId(delegatorId: string): Promise<TaskDelegation[]>;
  abstract findByDelegatorIdWithFilters(options: {
    delegatorId: string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ delegations: TaskDelegation[]; total: number }>;
}