import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { DepartmentHierarchyService } from 'src/department/application/services/department-hierarchy.service';
import { TaskRejectedEvent } from '../../domain/events/task-rejected.event';
import { Task, TaskStatus } from '../../domain/entities/task.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface RejectTaskSubmissionInputDto {
  taskSubmissionId: string;
  feedback?: string;
}

@Injectable()
export class RejectTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskRepo: TaskRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    dto: RejectTaskSubmissionInputDto,
    userId: string,
  ): Promise<{
    taskSubmission: TaskSubmission;
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const taskSubmission = await this.taskSubmissionRepo.findById(
      dto.taskSubmissionId,
    );
    if (!taskSubmission)
      throw new NotFoundException({ id: 'task_submission_not_found' });

    // Check if submission is already reviewed
    if (taskSubmission.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException(
        'Task submission has already been reviewed',
      );
    }

    // Check department access if userId is provided
    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();
    const reviewer = await this.validateRejectionRights(
      userId,
      taskSubmission.task,
      userRole,
    );
    taskSubmission.reject(reviewer, dto.feedback);

    // Update task status back to TODO
    const task = taskSubmission.task;
    task.status = TaskStatus.TODO;
    task.completedAt = null;

    const [savedSubmission] = await Promise.all([
      this.taskSubmissionRepo.save(taskSubmission),
      this.taskRepo.save(task),
      this.eventEmitter.emitAsync(
        TaskRejectedEvent.name,
        new TaskRejectedEvent(
          task.id.toString(),
          task.title,
          task.assignee?.userId.toString(),
          taskSubmission.performer?.userId.toString(),
          new Date(),
        ),
      ),
    ]);

    // Get attachments for the rejected submission
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [savedSubmission.id.toString()],
    });

    return { taskSubmission: savedSubmission, attachments };
  }

  private async validateRejectionRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    // Use assignment type instead of approval level
    switch (task.assignmentType) {
      case 'DEPARTMENT':
        return this.validateDepartmentRejection(userId, task, role);
      case 'SUB_DEPARTMENT':
        return this.validateSubDepartmentRejection(userId, task, role);
      case 'INDIVIDUAL':
        return this.validateIndividualRejection(userId, task, role);
      default:
        throw new ForbiddenException('Invalid task assignment type');
    }
  }

  private async validateDepartmentRejection(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Admin> {
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

    return this.adminRepository.findByUserId(userId);
  }

  private async validateSubDepartmentRejection(
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
          'You do not have permission to reject tasks for this sub-department',
        );
      }

      return supervisor;
    }

    throw new ForbiddenException(
      'Only administrators and supervisors can reject sub-department level tasks',
    );
  }

  private async validateIndividualRejection(
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
