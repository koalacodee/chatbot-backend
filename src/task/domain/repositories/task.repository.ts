import { Task } from '../entities/task.entity';

export abstract class TaskRepository {
  abstract save(task: Task): Promise<Task>;
  abstract findById(id: string): Promise<Task | null>;
  abstract findAll(
    offset?: number,
    limit?: number,
    departmentIds?: string[],
    start?: Date,
    end?: Date,
  ): Promise<Task[]>;
  abstract removeById(id: string): Promise<Task | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;

  abstract findByAssignee(assigneeId: string): Promise<Task[]>;
  abstract findByDepartment(departmentId: string): Promise<Task[]>;

  abstract findByAssignmentType(
    assignmentType: string,
    targetId?: string,
  ): Promise<Task[]>;
  abstract findDepartmentLevelTasks(departmentId?: string): Promise<Task[]>;
  abstract findSubDepartmentLevelTasks(
    subDepartmentId?: string,
  ): Promise<Task[]>;
  abstract findSubIndividualsLevelTasks(
    subDepartmentId?: string,
  ): Promise<Task[]>;
  abstract findTeamTasks(options: {
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<Task[]>;

  abstract findTasksForSupervisor(options: {
    supervisorDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }>;

  abstract findTasksForEmployee(options: {
    employeeId: string;
    supervisorId: string;
    subDepartmentIds: string[];
    status?: string[];
    offset?: number;
    limit?: number;
  }): Promise<{ tasks: Task[]; total: number }>;

  abstract getTaskMetricsForSupervisor(
    supervisorDepartmentIds: string[],
  ): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
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

  abstract getTaskMetricsForDepartment(departmentId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTaskMetricsForSubDepartment(subDepartmentId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  abstract getTaskMetricsForIndividual(assigneeId?: string): Promise<{
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  }>;

  // Database-level filtering for reminder processing
  abstract findTaskForReminder(taskId: string): Promise<Task | null>;
}
