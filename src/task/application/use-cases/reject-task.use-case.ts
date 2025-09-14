import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { DepartmentHierarchyService } from '../services/department-hierarchy.service';
import { TaskRejectedEvent } from '../../domain/events/task-rejected.event';

interface RejectTaskInputDto {
  taskId: string;
  feedback?: string;
}

@Injectable()
export class RejectTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: RejectTaskInputDto, userId?: string): Promise<Task> {
    const existing = await this.taskRepo.findById(dto.taskId);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      await this.validateRejectionRights(userId, existing, userRole);
    }

    existing.status = 'TODO' as any;
    existing.completedAt = null;
    if (dto.feedback !== undefined) existing.feedback = dto.feedback as any;

    const savedTask = await this.taskRepo.save(existing);

    // Emit task rejected event for notification
    this.eventEmitter.emit(
      TaskRejectedEvent.name,
      new TaskRejectedEvent(
        existing.title,
        existing.id.toString(),
        existing.assignee?.id.toString() || '',
        new Date(),
      ),
    );

    return savedTask;
  }

  private async validateRejectionRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | void> {
    const approvalLevel = task.approvalLevel;

    switch (approvalLevel) {
      case 'DEPARTMENT_LEVEL':
        return this.validateDepartmentLevelRejection(userId, task, role);
      case 'SUB_DEPARTMENT_LEVEL':
        return this.validateSubDepartmentLevelRejection(userId, task, role);
      case 'EMPLOYEE_LEVEL':
        return this.validateEmployeeLevelRejection(userId, task, role);
      default:
        throw new ForbiddenException('Invalid task rejection level');
    }
  }

  private async validateDepartmentLevelRejection(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    // Department level tasks can only be rejected by admins
    if (role !== Roles.ADMIN) {
      throw new ForbiddenException(
        'Department-level tasks can only be reject by administrators',
      );
    }

    // Ensure task has target department
    if (!task.targetDepartment) {
      throw new BadRequestException(
        'Department-level task must have target department',
      );
    }

    return;
  }

  private async validateSubDepartmentLevelRejection(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | void> {
    // Admins can approve any sub-department task
    if (role === Roles.ADMIN) {
      return;
    }

    // Supervisors can approve sub-department tasks under their supervision
    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      if (!supervisor) {
        throw new ForbiddenException('Supervisor not found');
      }

      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      if (!task.targetSubDepartment) {
        throw new BadRequestException(
          'Sub-department level task must have target sub-department',
        );
      }

      const hasAccess =
        await this.departmentHierarchyService.hasHierarchicalAccess(
          task.targetSubDepartment.id.toString(),
          supervisorDepartmentIds,
        );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to reject tasks for this sub-department',
        );
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can reject sub-department level tasks',
    );
  }

  private async validateEmployeeLevelRejection(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor> {
    // Admins can approve any employee-level task
    if (role === Roles.ADMIN) {
      return;
    }

    // Supervisors can approve employee-level tasks for employees under their supervision
    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      if (!supervisor) {
        throw new ForbiddenException('Supervisor not found');
      }

      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      if (!task.assignee) {
        throw new BadRequestException('Employee-level task must have assignee');
      }

      // Get employee's department/sub-department
      const employee = await this.employeeRepository.findById(
        task.assignee.id.toString(),
      );
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      let employeeDepartmentIds: string[] = [];

      // Get employee's sub-department IDs
      if (employee.subDepartments && employee.subDepartments.length > 0) {
        employeeDepartmentIds = employee.subDepartments.map((d) =>
          d.id.toString(),
        );
      }

      // If employee has no sub-departments, check supervisor's departments
      if (employeeDepartmentIds.length === 0 && employee.supervisor) {
        employeeDepartmentIds = employee.supervisor.departments.map((d) =>
          d.id.toString(),
        );
      }

      // Check if employee belongs to any department under supervisor's supervision
      const hasAccess = employeeDepartmentIds.some(
        (deptId) =>
          supervisorDepartmentIds.includes(deptId) ||
          this.departmentHierarchyService.hasHierarchicalAccess(
            deptId,
            supervisorDepartmentIds,
          ),
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to reject tasks for this employee',
        );
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can reject employee-level tasks',
    );
  }
}
