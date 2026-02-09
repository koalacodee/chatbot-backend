import {
  createCursorPagination,
  type CursorInput,
  type PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';
import type {
  DatabaseInstance,
  DrizzleTransaction,
} from '@/common/drizzle/drizzle.service';
import { tasks } from '@/common/drizzle/schema';
import type {
  Task,
  TaskAssignmentType,
  TaskPriority,
  TaskStatus,
} from '@/v2/tasks/domain/entities/task.entity';
import type { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import type { TaskDelegationSubmission } from '@/v2/tasks/domain/entities/task-delegation-submission.entity';
import type { TaskSubmission } from '@/v2/tasks/domain/entities/task-submission.entity';
import type {
  DepartmentTaskFilters,
  IndividualTaskFilters,
  TaskRepository,
} from '@/v2/tasks/domain/repositories/task.repository';
import type { Attachment } from '@/filehub/domain/entities/attachment.entity';
import type { TaskCursorData } from './mappers';
import { mapRowToTask } from './mappers';
import * as crud from './repository-crud';
import * as find from './repository-find';
import * as get from './repository-get';
import * as misc from './repository-misc';
import type { TaskRepoContext } from './repository-query';
import * as team from './repository-team';

export class DrizzleTaskRepository implements TaskRepository {
  private readonly pagination = createCursorPagination<TaskCursorData>({
    table: tasks,
    cursorFields: [
      { column: tasks.createdAt, key: 'createdAt' },
      { column: tasks.id, key: 'id' },
    ],
    defaultPageSize: 10,
    sortDirection: 'desc',
  });

  private get ctx(): TaskRepoContext {
    return {
      db: this.db,
      pagination: this.pagination,
      mapRowToTask,
    };
  }

  constructor(private readonly db: DatabaseInstance | DrizzleTransaction) {}

  static fromTransaction(tx: DrizzleTransaction): DrizzleTaskRepository {
    return new DrizzleTaskRepository(tx);
  }

  async save(task: Task): Promise<Task> {
    return crud.save(this.ctx, task);
  }

  async findById(id: string): Promise<Task | null> {
    return crud.findById(this.ctx, id);
  }

  async findByIds(ids: string[]): Promise<Task[]> {
    return crud.findByIds(this.ctx, ids);
  }

  async findAll(filters?: {
    cursor?: CursorInput;
    departmentIds?: string[];
    assigneeId?: string;
    departmentId?: string;
    start?: Date;
    end?: Date;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    search?: string;
  }): Promise<PaginatedArrayResult<Task>> {
    return crud.findAll(this.ctx, filters);
  }

  async removeById(id: string): Promise<Task | null> {
    return crud.removeById(this.ctx, id);
  }

  async exists(id: string): Promise<boolean> {
    return crud.exists(this.ctx, id);
  }

  async count({
    departmentIds,
  }: {
    departmentIds?: string[];
  } = {}): Promise<number> {
    return crud.count(this.ctx, { departmentIds });
  }

  async findByAssignee(
    assigneeId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findByAssignee(this.ctx, assigneeId, cursor);
  }

  async findByDepartment(
    departmentId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findByDepartment(this.ctx, departmentId, cursor);
  }

  async findByAssignmentType(
    assignmentType: TaskAssignmentType,
    targetId?: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findByAssignmentType(
      this.ctx,
      assignmentType,
      targetId,
      cursor,
    );
  }

  async findDepartmentLevelTasks(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findDepartmentLevelTasks(this.ctx, departmentId, filters);
  }

  async findSubDepartmentLevelTasks(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findSubDepartmentLevelTasks(this.ctx, subDepartmentId, filters);
  }

  async findSubIndividualsLevelTasks(
    filters?: IndividualTaskFilters,
  ): Promise<PaginatedArrayResult<Task>> {
    return find.findSubIndividualsLevelTasks(this.ctx, filters);
  }

  async findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    return team.findTeamTasks(this.ctx, {
      ...options,
      status: options.status,
    });
  }

  async findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    return team.findTasksForSupervisor(this.ctx, {
      ...options,
      status: options.status,
    });
  }

  async findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>> {
    return team.findTasksForEmployee(this.ctx, {
      ...options,
      status: options.status,
    });
  }

  async getTaskMetricsForSupervisor(
    supervisorDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return get.getTaskMetricsForSupervisor(this.ctx, supervisorDepartmentIds);
  }

  async getTasksForSupervisor(options: {
    supervisorUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    departmentId?: string;
  }): Promise<
    PaginatedArrayResult<{
      task: Task;
      rejectionReason?: string;
      approvalFeedback?: string;
    }> & {
      fileHubAttachments: Attachment[];
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }
  > {
    return get.getTasksForSupervisor(this.ctx, options);
  }

  async getTaskMetricsForEmployee(
    employeeId: string,
    supervisorId: string,
    subDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return get.getTaskMetricsForEmployee(
      this.ctx,
      employeeId,
      supervisorId,
      subDepartmentIds,
    );
  }

  async getTaskMetricsForDepartment(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return get.getTaskMetricsForDepartment(this.ctx, departmentId, filters);
  }

  async getTaskMetricsForSubDepartment(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return get.getTaskMetricsForSubDepartment(
      this.ctx,
      subDepartmentId,
      filters,
    );
  }

  async getTeamTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    departmentId?: string;
    subDepartmentId?: string;
  }): Promise<
    PaginatedArrayResult<{
      task: {
        data: Task;
        submissions: TaskSubmission[];
        delegationSubmissions: TaskDelegationSubmission[];
      };
    }> & {
      fileHubAttachments: Attachment[];
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }
  > {
    return get.getTeamTasksForSupervisor(this.ctx, options);
  }

  async getTaskMetricsForIndividual(filters?: IndividualTaskFilters): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }> {
    return get.getTaskMetricsForIndividual(this.ctx, filters);
  }

  async getTasksAndDelegationsForEmployee(options: {
    employeeUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    subDepartmentId?: string;
  }): Promise<
    PaginatedArrayResult<{
      task: Task;
      rejectionReason?: string;
      approvalFeedback?: string;
    }> & {
      delegations: TaskDelegation[];
      fileHubAttachments: Attachment[];
      metrics: {
        pendingTasks: number;
        pendingDelegations: number;
        completedTasks: number;
        completedDelegations: number;
        taskCompletionPercentage: number;
        delegationCompletionPercentage: number;
        totalPercentage: number;
      };
    }
  > {
    return get.getTasksAndDelegationsForEmployee(this.ctx, options);
  }

  async findTaskForReminder(taskId: string): Promise<Task | null> {
    return misc.findTaskForReminder(this.ctx, taskId);
  }

  async restart(taskId: string): Promise<void> {
    return misc.restart(this.ctx, taskId);
  }
}
