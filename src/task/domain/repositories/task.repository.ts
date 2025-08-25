import { Task } from '../entities/task.entity';

export abstract class TaskRepository {
  abstract save(task: Task): Promise<Task>;
  abstract findById(id: string): Promise<Task | null>;
  abstract findAll(offset?: number, limit?: number): Promise<Task[]>;
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
}
