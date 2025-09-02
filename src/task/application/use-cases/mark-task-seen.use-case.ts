import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface MarkTaskSeenInputDto {
  taskId: string;
}

@Injectable()
export class MarkTaskSeenUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: MarkTaskSeenInputDto, userId?: string): Promise<Task> {
    const existing = await this.taskRepo.findById(dto.taskId);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(userId, existing, userRole);
    }

    existing.status = 'SEEN' as any;
    return this.taskRepo.save(existing);
  }

  private async checkTaskAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all tasks
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());
      
      // Check if task targets supervisor's departments
      const targetDepartmentId = task.targetDepartment?.id.toString();
      const targetSubDepartmentId = task.targetSubDepartment?.id.toString();
      
      hasAccess = (targetDepartmentId && supervisorDepartmentIds.includes(targetDepartmentId)) ||
                  (targetSubDepartmentId && supervisorDepartmentIds.includes(targetSubDepartmentId));
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
      
      // Check if task targets employee's departments or is assigned to them
      const targetDepartmentId = task.targetDepartment?.id.toString();
      const targetSubDepartmentId = task.targetSubDepartment?.id.toString();
      const isAssignedToEmployee = task.assignee?.id.toString() === employee?.id.toString();
      
      hasAccess = isAssignedToEmployee ||
                  (targetDepartmentId && employeeDepartmentIds.includes(targetDepartmentId)) ||
                  (targetSubDepartmentId && employeeDepartmentIds.includes(targetSubDepartmentId));
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to mark this task as seen',
      );
    }
  }
}
