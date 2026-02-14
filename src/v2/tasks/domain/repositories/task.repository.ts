import type { Task, TaskPriority, TaskStatus } from '../entities/task.entity';
import type { TaskDelegation } from '../entities/task-delegation.entity';
import type { TaskDelegationSubmission } from '../entities/task-delegation-submission.entity';
import type { TaskSubmission } from '../entities/task-submission.entity';
import { Attachment } from '@/filehub/domain/entities/attachment.entity';
import {
  CursorInput,
  PaginatedArrayResult,
} from '@/common/drizzle/helpers/cursor';

export interface DepartmentTaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
  cursor?: CursorInput;
}

export interface EmployeeTasksResult {
  tasks: Array<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }>;
  delegations: TaskDelegation[];
  total: number;
  fileHubAttachments: Attachment[];
  metrics: {
    pendingTasks: number;
    completedTasks: number;
    pendingDelegations: number;
    completedDelegations: number;
    taskCompletionPercentage: number;
    delegationCompletionPercentage: number;
    totalPercentage: number;
  };
}

export interface IndividualTaskFilters extends DepartmentTaskFilters {
  assigneeId?: string;
  departmentIds?: string[];
}

export interface MyTasksResult {
  tasks: Array<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }>;
  delegations?: TaskDelegation[];
  total: number;
  fileHubAttachments: Attachment[];
  metrics: {
    pendingTasks: number;
    completedTasks: number;
    taskCompletionPercentage: number;
  };
}

export abstract class TaskRepository {
  abstract save(task: Task): Promise<Task>;
  abstract findById(id: string): Promise<Task | null>;
  abstract findByIdWithSubmissions(
    id: string,
  ): Promise<{ task: Task; submissions: TaskSubmission[] } | null>;
  abstract findByIds(ids: string[]): Promise<Task[]>;
  abstract findByIdsWithSubmissions(
    ids: string[],
  ): Promise<{ task: Task; submissions: TaskSubmission[] }[]>;
  abstract findAll(
    // opaque cursor
    filters?: {
      cursor?: CursorInput;
      departmentIds?: string[]; // for role-based filtering
      assigneeId?: string; // explicit filter
      departmentId?: string; // explicit filter
      start?: Date;
      end?: Date;
      status?: TaskStatus[];
      priority?: TaskPriority[];
      search?: string;
    },
  ): Promise<PaginatedArrayResult<Task>>;
  abstract removeById(id: string): Promise<Task | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(options?: { departmentIds?: string[] }): Promise<number>;

  abstract findByAssignee(
    assigneeId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>>;
  abstract findByDepartment(
    departmentId: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>>;

  abstract findByAssignmentType(
    assignmentType: string,
    targetId?: string,
    cursor?: CursorInput,
  ): Promise<PaginatedArrayResult<Task>>;
  abstract findDepartmentLevelTasks(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<
    PaginatedArrayResult<{ task: Task; submissions: TaskSubmission[] }>
  >;
  abstract findSubDepartmentLevelTasks(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedArrayResult<Task>>;
  abstract findSubIndividualsLevelTasks(
    filters?: IndividualTaskFilters,
  ): Promise<PaginatedArrayResult<Task>>;
  abstract findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>>;

  abstract findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>>;

  abstract findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedArrayResult<Task>>;

  abstract getTaskMetricsForSupervisor(
    supervisorDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTasksForSupervisor(options: {
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
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }
  >;

  abstract getTaskMetricsForEmployee(
    employeeId: string,
    supervisorId: string,
    subDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTaskMetricsForDepartment(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTaskMetricsForSubDepartment(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTeamTasksForSupervisor(options: {
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
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }
  >;

  abstract getTaskMetricsForIndividual(
    filters?: IndividualTaskFilters,
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;
  abstract getTasksAndDelegationsForEmployee(options: {
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
        completedTasks: number;
        pendingDelegations: number;
        completedDelegations: number;
        taskCompletionPercentage: number;
        delegationCompletionPercentage: number;
        totalPercentage: number;
      };
    }
  >;

  abstract getUnifiedMyTasksForEmployee(options: {
    employeeUserId: string;
    status?: TaskStatus[];
    priority?: TaskPriority[];
    cursor?: CursorInput;
    search?: string;
    subDepartmentId?: string;
  }): Promise<
    PaginatedArrayResult<{
      type: 'task' | 'delegation';
      taskId: string;
      delegationId?: string;
      task: Task;
      statusOverride?: TaskStatus;
      rejectionReason?: string;
      approvalFeedback?: string;
      submissions?: TaskDelegationSubmission[];
      createdAt: Date;
    }> & {
      fileHubAttachments: Attachment[];
      metrics: {
        pendingTasks: number;
        completedTasks: number;
        taskCompletionPercentage: number;
      };
    }
  >;

  // Database-level filtering for reminder processing
  abstract findTaskForReminder(taskId: string): Promise<Task | null>;

  abstract restart(taskId: string): Promise<void>;
}
