import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { TaskApprovedEvent } from 'src/task/domain/events/task-approved.event';
import { TaskRejectedEvent } from '../../domain/events/task-rejected.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DepartmentHierarchyService } from '../services/department-hierarchy.service';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';

interface ApproveTaskInputDto {
  taskId: string;
}

@Injectable()
export class ApproveTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminRepository: AdminRepository,
  ) {}

  async execute(dto: ApproveTaskInputDto, userId?: string): Promise<Task> {
    const [task, approver] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo.findById(userId),
    ]);

    if (!task) throw new NotFoundException({ id: 'task_not_found' });
    if (!approver) throw new NotFoundException({ approverId: 'not_found' });

    // Validate approval rights based on task level and user role
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      task.approver = await this.validateApprovalRights(userId, task, userRole);
    }

    task.status = 'COMPLETED' as any;
    task.completedAt = new Date();

    const [savedTask] = await Promise.all([
      this.taskRepo.save(task),
      this.eventEmitter.emitAsync(
        TaskApprovedEvent.name,
        new TaskApprovedEvent(
          task.title,
          task.id.toString(),
          approver.id.toString(),
          new Date(),
        ),
      ),
    ]);

    // Emit task approved event for notification
    this.eventEmitter.emit(
      TaskApprovedEvent.name,
      new TaskApprovedEvent(
        task.title,
        task.id.toString(),
        task.assignee?.id.toString() || '',
        new Date(),
      ),
    );

    return savedTask;
  }

  private async validateApprovalRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    const approvalLevel = task.approvalLevel;

    switch (approvalLevel) {
      case 'DEPARTMENT_LEVEL':
        return this.validateDepartmentLevelApproval(userId, task, role);
      case 'SUB_DEPARTMENT_LEVEL':
        return this.validateSubDepartmentLevelApproval(userId, task, role);
      case 'EMPLOYEE_LEVEL':
        return this.validateEmployeeLevelApproval(userId, task, role);
      default:
        throw new ForbiddenException('Invalid task approval level');
    }
  }

  private async validateDepartmentLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Admin> {
    // Department level tasks can only be approved by admins
    if (role !== Roles.ADMIN) {
      throw new ForbiddenException(
        'Department-level tasks can only be approved by administrators',
      );
    }

    // Ensure task has target department
    if (!task.targetDepartment) {
      throw new BadRequestException(
        'Department-level task must have target department',
      );
    }

    return this.adminRepository.findByUserId(userId);
  }

  private async validateSubDepartmentLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    // Admins can approve any sub-department task
    if (role === Roles.ADMIN) {
      return this.adminRepository.findByUserId(userId);
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
          'You do not have permission to approve tasks for this sub-department',
        );
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can approve sub-department level tasks',
    );
  }

  private async validateEmployeeLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    // Admins can approve any employee-level task
    if (role === Roles.ADMIN) {
      return this.adminRepository.findByUserId(userId);
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
          'You do not have permission to approve tasks for this employee',
        );
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can approve employee-level tasks',
    );
  }
}
