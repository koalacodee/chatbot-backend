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
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { TaskApprovedEvent } from 'src/task/domain/events/task-approved.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DepartmentHierarchyService } from '../services/department-hierarchy.service';

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
    private readonly departmentRepository: DepartmentRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ApproveTaskInputDto, userId?: string): Promise<Task> {
    if (!dto.approverId)
      throw new BadRequestException({ approverId: 'required' });

    const [task, approver] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo.findById(dto.approverId),
    ]);

    if (!task) throw new NotFoundException({ id: 'task_not_found' });
    if (!approver) throw new NotFoundException({ approverId: 'not_found' });

    // Validate approval rights based on task level and user role
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.validateApprovalRights(userId, task, userRole);
    }

    task.approver = approver as any;
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
          task?.performer?.id.toString(),
        ),
      ),
    ]);

    return savedTask;
  }

  private async validateApprovalRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    const approvalLevel = task.approvalLevel;

    switch (approvalLevel) {
      case 'DEPARTMENT_LEVEL':
        await this.validateDepartmentLevelApproval(userId, task, role);
        break;
      case 'SUB_DEPARTMENT_LEVEL':
        await this.validateSubDepartmentLevelApproval(userId, task, role);
        break;
      case 'EMPLOYEE_LEVEL':
        await this.validateEmployeeLevelApproval(userId, task, role);
        break;
      default:
        throw new ForbiddenException('Invalid task approval level');
    }
  }

  private async validateDepartmentLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    // Department level tasks can only be approved by admins
    if (role !== Roles.ADMIN) {
      throw new ForbiddenException(
        'Department-level tasks can only be approved by administrators',
      );
    }

    // Ensure task has target department
    if (!task.targetDepartment) {
      throw new BadRequestException('Department-level task must have target department');
    }
  }

  private async validateSubDepartmentLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
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
        throw new BadRequestException('Sub-department level task must have target sub-department');
      }

      const hasAccess = await this.departmentHierarchyService.hasHierarchicalAccess(
        task.targetSubDepartment.id.toString(),
        supervisorDepartmentIds,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to approve tasks for this sub-department',
        );
      }

      return;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can approve sub-department level tasks',
    );
  }

  private async validateEmployeeLevelApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
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
      const employee = await this.employeeRepository.findById(task.assignee.id.toString());
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      let employeeDepartmentIds: string[] = [];
      
      // Get employee's sub-department IDs
      if (employee.subDepartments && employee.subDepartments.length > 0) {
        employeeDepartmentIds = employee.subDepartments.map(d => d.id.toString());
      }
      
      // If employee has no sub-departments, check supervisor's departments
      if (employeeDepartmentIds.length === 0 && employee.supervisor) {
        employeeDepartmentIds = employee.supervisor.departments.map(d => d.id.toString());
      }

      // Check if employee belongs to any department under supervisor's supervision
      const hasAccess = employeeDepartmentIds.some(deptId =>
        supervisorDepartmentIds.includes(deptId) ||
        this.departmentHierarchyService.hasHierarchicalAccess(deptId, supervisorDepartmentIds)
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to approve tasks for this employee',
        );
      }

      return;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can approve employee-level tasks',
    );
  }
}
