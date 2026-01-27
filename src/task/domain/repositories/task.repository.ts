import { TaskDelegation } from '../entities/task-delegation.entity';
import { Task, TaskPriority, TaskStatus } from '../entities/task.entity';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { CursorInput, PaginatedResult } from 'src/common/drizzle/helpers/cursor';
import { TaskSubmission } from '../entities/task-submission.entity';
import { TaskDelegationSubmission } from '../entities/task-delegation-submission.entity';

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
  abstract findByIds(ids: string[]): Promise<Task[]>;
  abstract findAll(
    // opaque cursor
    filters?: {
      cursor?: CursorInput;
      departmentIds?: string[];
      start?: Date;
      end?: Date;
    },
  ): Promise<PaginatedResult<Task>>;
  abstract removeById(id: string): Promise<Task | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByAssignee(assigneeId: string, cursor?: CursorInput): Promise<PaginatedResult<Task>>;
  abstract findByDepartment(departmentId: string, cursor?: CursorInput): Promise<PaginatedResult<Task>>;

  abstract findByAssignmentType(
    assignmentType: string,
    targetId?: string,
    cursor?: CursorInput,
  ): Promise<PaginatedResult<Task>>;
  abstract findDepartmentLevelTasks(
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedResult<Task>>;
  abstract findSubDepartmentLevelTasks(
    subDepartmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<PaginatedResult<Task>>;
  abstract findSubIndividualsLevelTasks(
    filters?: IndividualTaskFilters,
  ): Promise<PaginatedResult<Task>>;
  abstract findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedResult<Task>>;

  abstract findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedResult<Task>>;

  abstract findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: string[];
    cursor?: CursorInput;
  }): Promise<PaginatedResult<Task>>;

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
  }): Promise<PaginatedResult<{
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
  }>;

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
  }): Promise<PaginatedResult<{
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
  }>;

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
  }): Promise<PaginatedResult<{
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
  }>;

  // Database-level filtering for reminder processing
  abstract findTaskForReminder(taskId: string): Promise<Task | null>;
}
