import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetTasksWithFiltersInputDto {
  assigneeId?: string;
  departmentId?: string;
  status?: string; // TaskStatus as string
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetTasksWithFiltersUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) { }

  async execute(
    dto: GetTasksWithFiltersInputDto,
    userId?: string,
  ): Promise<{ tasks: Task[]; attachments: { [taskId: string]: string[] } }> {
    const { assigneeId, departmentId, status, offset, limit } = dto;

    // Apply department filtering if userId is provided
    let departmentIds: string[] | undefined = undefined;
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      departmentIds = await this.getUserDepartmentIds(userId, userRole);
    }

    // Choose the most selective repository method available, then filter in-memory for the rest.
    let base: Task[];
    if (assigneeId && !departmentId) {
      const result = await this.taskRepo.findByAssignee(assigneeId);
      base = result.data;
    } else if (departmentId && !assigneeId) {
      const result = await this.taskRepo.findByDepartment(departmentId);
      base = result.data;
    } else {
      const result = await this.taskRepo.findAll({ departmentIds });
      base = result.data;
    }

    let filtered = base;
    if (assigneeId) {
      filtered = filtered.filter(
        (t) => t.assignee.id.toString() === assigneeId,
      );
    }
    if (departmentId) {
      filtered = filtered.filter(
        (t) => t.targetDepartment.id.toString() === departmentId,
      );
    }
    if (status) {
      filtered = filtered.filter((t) => (t.status as any) === status);
    }

    // Apply pagination after filtering
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    const tasks = filtered.slice(start, end);

    // Get attachments for all tasks
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: tasks.map((task) => task.id.toString()),
    });

    return { tasks, attachments };
  }

  private async getUserDepartmentIds(
    userId: string,
    role: Roles,
  ): Promise<string[]> {
    if (role === Roles.ADMIN) {
      return []; // Admins see all tasks (no filtering)
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      return supervisor.departments.map((d) => d.id.toString());
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      return (
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        []
      );
    }
    return [];
  }
}
