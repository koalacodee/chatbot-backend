import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

@Injectable()
export class GetAllTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(
    offset?: number,
    limit?: number,
    userId?: string,
  ): Promise<{ tasks: Task[]; attachments: { [taskId: string]: string[] } }> {
    let departmentIds: string[] | undefined = undefined;

    // Apply department filtering if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      departmentIds = await this.getUserDepartmentIds(userId, userRole);
    }

    const tasks = await this.taskRepo.findAll(offset, limit, departmentIds);

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
