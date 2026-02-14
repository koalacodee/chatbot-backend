import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { FileHubService } from '@/filehub/domain/services/filehub.service';
import {
  TaskStatus,
  TaskAssignmentType,
} from '../../domain/entities/task.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Employee } from '@/employee/domain/entities/employee.entity';
import { TaskSubmittedEvent } from '../../domain/events/task-submitted.event';
import { CloneTaskAttachmentsEvent } from '../../domain/events/clone-task-attachments.event';

interface SubmitTaskSubmissionInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string;
  attach?: boolean;
  chooseAttachments?: string[];
}

@Injectable()
export class SubmitTaskSubmissionUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(dto: SubmitTaskSubmissionInputDto): Promise<{
    taskSubmission: ReturnType<typeof TaskSubmission.prototype.toJSON>;
    fileHubUploadKey?: string;
  }> {
    const task = await this.taskRepo.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException({ taskId: 'not_found' });
    }

    // Validate task status: Parity with v1 (don't allow if completed)
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is already completed');
    }

    // Robust access control (Hierarchy support)
    const user = await this.userRepo.findById(dto.submittedBy);
    const userRole = user.role.getRole();
    await this.validateSubmissionRights(dto.submittedBy, task, userRole);

    // Determine performer type and get performer entity
    let performerType: 'admin' | 'supervisor' | 'employee';
    let performer: Supervisor | Admin | Employee;

    if (userRole === Roles.ADMIN) {
      performerType = 'admin';
      performer = await this.adminRepository.findByUserId(dto.submittedBy);
    } else if (userRole === Roles.SUPERVISOR) {
      performerType = 'supervisor';
      performer = await this.supervisorRepository.findByUserId(dto.submittedBy);
    } else {
      performerType = 'employee';
      performer = await this.employeeRepository.findByUserId(dto.submittedBy);
    }

    if (!performer) {
      throw new NotFoundException(
        `Performer record not found for user ${dto.submittedBy}`,
      );
    }

    // Create submission (performerId must be admin/supervisor/employee id, not userId)
    const submission = TaskSubmission.create({
      taskId: dto.taskId,
      task,
      performerId: performer.id.toString(),
      performerType,
      performer,
      notes: dto.notes,
      status: TaskSubmissionStatus.SUBMITTED,
    });

    // Update task status
    task.status = TaskStatus.PENDING_REVIEW;

    const [savedSubmission, fileHubUploadKey] = await Promise.all([
      this.taskSubmissionRepo.save(submission),
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: submission.id,
              userId: dto.submittedBy,
            })
            .then((upload) => upload.uploadKey)
        : undefined,
      this.taskRepo.save(task),
    ]);

    // Restore Attachment Cloning (User requested via CloneTaskAttachmentsEvent)
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.eventEmitter.emitAsync(
        CloneTaskAttachmentsEvent.name,
        new CloneTaskAttachmentsEvent(
          savedSubmission.id,
          dto.chooseAttachments,
        ),
      );
    }

    // Restore Domain Events (TaskSubmittedEvent for routing)
    let reviewType: 'ADMIN_REVIEW' | 'SUPERVISOR_AND_ADMIN_REVIEW' =
      'ADMIN_REVIEW';
    if (
      task.assignmentType === TaskAssignmentType.INDIVIDUAL ||
      task.assignmentType === TaskAssignmentType.SUB_DEPARTMENT
    ) {
      reviewType = 'SUPERVISOR_AND_ADMIN_REVIEW';
    }

    const assignee = await this.getAssigneeInfo(task);

    await this.eventEmitter.emitAsync(
      'task.submitted',
      new TaskSubmittedEvent(
        task.id,
        task.title,
        reviewType === 'ADMIN_REVIEW'
          ? 'ADMIN_REVIEW'
          : 'SUPERVISOR_AND_ADMIN_REVIEW',
        assignee?.userId,
        assignee?.supervisorId,
        new Date(),
      ),
    );

    return {
      taskSubmission: savedSubmission.toJSON(),
      fileHubUploadKey,
    };
  }

  private async validateSubmissionRights(
    userId: string,
    task: {
      creatorId: string;
      assigneeId?: string;
      targetSubDepartmentId?: string;
      targetDepartmentId?: string;
      assignmentType: TaskAssignmentType;
    },
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) return;

    // Creator always has access
    if (task.creatorId === userId) return;

    if (role === Roles.SUPERVISOR) {
      // Check for hierarchical access to the task's department or assignee
      if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: { supervisorUserId: userId },
              employee: { employeeUserId: task.assigneeId },
            });
          if (hasAccess) return;
        }
      } else {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            task.targetDepartmentId ?? task.targetSubDepartmentId,
          );
        if (hasAccess) return;
      }
    } else if (role === Roles.EMPLOYEE) {
      if (task.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            task.targetSubDepartmentId,
          );
        if (hasAccess) return;
      } else if (task.assigneeId) {
        const employee = await this.employeeRepository.findByUserId(userId);
        if (employee) {
          if (employee.id.toString() === task.assigneeId) {
            return;
          }
        }
      }
    }

    throw new ForbiddenException('You do not have access to submit this task');
  }

  private async getAssigneeInfo(task: { assigneeId?: string }) {
    if (!task.assigneeId) return null;
    const employee = await this.employeeRepository.findByUserId(
      task.assigneeId,
    );
    if (!employee) return null;
    return {
      userId: employee.userId.toString(),
      supervisorId: employee.supervisor?.userId.toString(),
    };
  }
}
