import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { TaskApprovedEvent } from 'src/task/domain/events/task-approved.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DepartmentHierarchyService } from 'src/department/application/services/department-hierarchy.service';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Task, TaskStatus } from '../../domain/entities/task.entity';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface ApproveTaskSubmissionInputDto {
  taskSubmissionId: string;
  feedback?: string;
}

@Injectable()
export class ApproveTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentHierarchyService: DepartmentHierarchyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminRepository: AdminRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    dto: ApproveTaskSubmissionInputDto,
    userId?: string,
  ): Promise<{
    taskSubmission: TaskSubmission;
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    const [taskSubmission, approver] = await Promise.all([
      this.taskSubmissionRepo.findById(dto.taskSubmissionId),
      this.userRepo.findById(userId),
    ]);

    if (!taskSubmission)
      throw new NotFoundException({
        details: [
          { field: 'taskSubmissionId', message: 'Task submission not found' },
        ],
      });
    if (!approver)
      throw new NotFoundException({
        details: [{ field: 'approverId', message: 'Approver not found' }],
      });

    // Check if submission is already reviewed
    if (taskSubmission.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException({
        details: [
          {
            field: 'taskSubmissionId',
            message: 'Task submission has already been reviewed',
          },
        ],
      });
    }

    // Validate approval rights based on task level and user role
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      const reviewer = await this.validateApprovalRights(
        userId,
        taskSubmission.task,
        userRole,
      );
      taskSubmission.approve(reviewer, dto.feedback);
    } else {
      taskSubmission.approve(null as any, dto.feedback);
    }

    // Update task status to COMPLETED
    const task = taskSubmission.task;
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    const [savedSubmission, savedTask] = await Promise.all([
      this.taskSubmissionRepo.save(taskSubmission),
      this.taskRepo.save(task),
      this.eventEmitter.emitAsync(
        TaskApprovedEvent.name,
        new TaskApprovedEvent(
          task.id.toString(),
          task.title,
          task.assignee?.userId.toString(),
          taskSubmission.performer?.userId.toString(),
          new Date(),
        ),
      ),
    ]);

    // Get attachments for the approved submission
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [savedSubmission.id.toString()],
    });

    return { taskSubmission: savedSubmission, attachments };
  }

  private async validateApprovalRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    // Use assignment type instead of approval level
    switch (task.assignmentType) {
      case 'DEPARTMENT':
        return this.validateDepartmentApproval(userId, task, role);
      case 'SUB_DEPARTMENT':
        return this.validateSubDepartmentApproval(userId, task, role);
      case 'INDIVIDUAL':
        return this.validateIndividualApproval(userId, task, role);
      default:
        throw new ForbiddenException({
          details: [{ field: 'task', message: 'Invalid task assignment type' }],
        });
    }
  }

  private async validateDepartmentApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Admin> {
    // Department tasks can only be approved by admins
    if (role !== Roles.ADMIN) {
      throw new ForbiddenException({
        details: [
          {
            field: 'role',
            message: 'Department tasks can only be approved by administrators',
          },
        ],
      });
    }

    // Ensure task has target department
    if (!task.targetDepartment) {
      throw new BadRequestException({
        details: [
          {
            field: 'task',
            message: 'Department task must have target department',
          },
        ],
      });
    }

    return this.adminRepository.findByUserId(userId);
  }

  private async validateSubDepartmentApproval(
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
        throw new ForbiddenException({
          details: [{ field: 'supervisorId', message: 'Supervisor not found' }],
        });
      }

      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      if (!task.targetSubDepartment) {
        throw new BadRequestException({
          details: [
            {
              field: 'task',
              message:
                'Sub-department level task must have target sub-department',
            },
          ],
        });
      }

      const hasAccess =
        await this.departmentHierarchyService.hasHierarchicalAccess(
          task.targetSubDepartment.id.toString(),
          supervisorDepartmentIds,
        );

      if (!hasAccess) {
        throw new ForbiddenException({
          details: [
            {
              field: 'permission',
              message:
                'You do not have permission to approve tasks for this sub-department',
            },
          ],
        });
      }

      return supervisor;
    }

    throw new ForbiddenException({
      details: [
        {
          field: 'role',
          message:
            'Only administrators and supervisors can approve sub-department level tasks',
        },
      ],
    });
  }

  private async validateIndividualApproval(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<Supervisor | Admin> {
    // Both admins and supervisors can approve individual tasks
    if (role === Roles.ADMIN) {
      return this.adminRepository.findByUserId(userId);
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      if (!supervisor) {
        throw new ForbiddenException({
          details: [{ field: 'supervisorId', message: 'Supervisor not found' }],
        });
      }

      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      if (!task.assignee) {
        throw new BadRequestException({
          details: [
            {
              field: 'task',
              message: 'Employee-level task must have assignee',
            },
          ],
        });
      }

      // Get employee's department/sub-department
      const employee = await this.employeeRepository.findById(
        task.assignee.id.toString(),
      );
      if (!employee) {
        throw new NotFoundException({
          details: [{ field: 'employeeId', message: 'Employee not found' }],
        });
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
        throw new ForbiddenException({
          details: [
            {
              field: 'permission',
              message:
                'You do not have permission to approve tasks for this employee',
            },
          ],
        });
      }

      return supervisor;
    }

    throw new ForbiddenException({
      details: [
        {
          field: 'role',
          message:
            'Only administrators and supervisors can approve employee-level tasks',
        },
      ],
    });
  }
}
