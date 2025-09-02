import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface ApproveTaskInputDto {
  taskId: string;
  approverId: string;
}

@Injectable()
export class ApproveTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(dto: ApproveTaskInputDto, userId?: string): Promise<Task> {
    if (!dto.approverId) throw new BadRequestException({ approverId: 'required' });

    const [task, approver] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo.findById(dto.approverId),
    ]);

    if (!task) throw new NotFoundException({ id: 'task_not_found' });
    if (!approver) throw new NotFoundException({ approverId: 'not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(userId, task, userRole);
    }

    task.approver = approver as any;
    task.status = 'COMPLETED' as any;
    task.completedAt = new Date();

    return this.taskRepo.save(task);
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
        'You do not have access to approve this task',
      );
    }
  }
}
