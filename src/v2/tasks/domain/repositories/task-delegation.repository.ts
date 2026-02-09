import { Department } from '@/department/domain/entities/department.entity';
import type { TaskDelegation } from '../entities/task-delegation.entity';
import {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import { Employee } from '@/employee/domain/entities/employee.entity';

export enum DelegableType {
  SUB_DEPARTMENT = 'SUB_DEPARTMENT',
  EMPLOYEE = 'EMPLOYEE',
}

export interface Delegable {
  type: DelegableType;
  name: string;
  itemId: string;
  email: string;
  username: string;
  jobTitle: string;
}

export abstract class TaskDelegationRepository {
  abstract save(taskDelegation: TaskDelegation): Promise<TaskDelegation>;
  abstract update(
    id: string,
    updates: Partial<TaskDelegation>,
  ): Promise<TaskDelegation>;
  abstract findById(id: string): Promise<TaskDelegation | null>;
  abstract findByIds(ids: string[]): Promise<TaskDelegation[]>;
  abstract findAll(): Promise<TaskDelegation[]>;
  abstract removeById(id: string): Promise<TaskDelegation | null>;
  abstract removeByIds(ids: string[]): Promise<TaskDelegation[]>;
  abstract deleteByTaskId(taskId: string): Promise<void>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByTaskId(taskId: string): Promise<TaskDelegation[]>;
  abstract findByTaskIds(taskIds: string[]): Promise<TaskDelegation[]>;
  abstract findByAssigneeId(assigneeId: string): Promise<TaskDelegation[]>;
  abstract findByAssigneeIds(assigneeIds: string[]): Promise<TaskDelegation[]>;
  abstract findByTargetSubDepartmentId(
    targetSubDepartmentId: string,
  ): Promise<TaskDelegation[]>;
  abstract findByTargetSubDepartmentIds(
    targetSubDepartmentIds: string[],
  ): Promise<TaskDelegation[]>;
  abstract findByDelegatorId(delegatorId: string): Promise<TaskDelegation[]>;
  abstract findByDelegatorIdWithFilters(options: {
    delegatorId: string;
    status?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ delegations: TaskDelegation[]; total: number }>;

  abstract findMyDelegationsForSupervisor(options: {
    delegator:
      | { delegatorId: string; delegatorUserId: never }
      | { delegatorUserId: string; delegatorId: never };
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<TaskDelegation>>;

  abstract findMyDelegationsForEmployee(options: {
    assignee:
      | { assigneeId: string; assigneeUserId: never }
      | { assigneeUserId: string; assigneeId: never };
    subDepartmentIds: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<TaskDelegation>>;

  abstract findBySubDepartment(
    subDepartmentId: string,
    options?: {
      cursor?: CursorInput;
      status?: string[];
    },
  ): Promise<PaginatedArrayResult<TaskDelegation>>;

  abstract findByTask(
    taskId: string,
    options?: {
      cursor?: CursorInput;
      status?: string[];
    },
  ): Promise<PaginatedArrayResult<TaskDelegation>>;

  abstract findDelegablesForSupervisor(
    supervisor:
      | {
          supervisorId: string;
          supervisorUserId: never;
        }
      | { supervisorUserId: string; supervisorId: never },
    search?: string,
  ): Promise<Delegable[]>;
}
