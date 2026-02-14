import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { FileHubService } from '@/filehub/domain/services/filehub.service';
import { DeleteAttachmentsByIdsUseCase } from '@/files/application/use-cases/delete-attachments-by-ids.use-case';
import { CloneTaskAttachmentsEvent } from '../../domain/events/clone-task-attachments.event';
import { ReminderQueueService } from '@/v2/tasks/infrastructure/queues/reminder.queue';
import { UUID } from '@/shared/value-objects/uuid.vo';

interface UpdateTaskInputDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  assigneeId?: string;
  assignerId?: string;
  approverId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignmentType?: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  attach?: boolean;
  deleteAttachments?: string[];
  chooseAttachments?: string[];
  deleteReminders?: string[];
  addReminders?: {
    name: string;
    reminderDate: Date;
    reminderInterval: number;
  }[];
}

@Injectable()
export class UpdateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly fileHubService: FileHubService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly reminderQueueService: ReminderQueueService,
  ) { }

  async execute(
    id: string,
    dto: UpdateTaskInputDto,
    userId?: string,
  ): Promise<{
    task: ReturnType<typeof Task.prototype.toJSON>;
    fileHubUploadKey?: string;
  }> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.validateAccess(userId, existing, userRole);
    }

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.dueDate !== undefined) existing.dueDate = dto.dueDate;
    if (dto.priority !== undefined) existing.priority = dto.priority;

    if (dto.assignerId !== undefined) {
      const user = await this.supervisorRepository.findByUserId(dto.assignerId);
      if (!user) throw new NotFoundException({ assignerId: 'not_found' });
      existing.assigner = user;
    }

    let newAssigneeName: string | undefined;

    if (dto.targetDepartmentId !== undefined) {
      if (dto.targetDepartmentId === null) {
        existing.targetDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(dto.targetDepartmentId);
        if (!dept)
          throw new NotFoundException({ targetDepartmentId: 'not_found' });
        existing.targetDepartment = dept;
        existing.targetDepartmentId = dept.id.toString();
        existing.targetSubDepartment = undefined;
        existing.targetSubDepartmentId = null;
        existing.assignee = undefined;
        existing.assigneeId = null;
        existing.assignmentType = TaskAssignmentType.DEPARTMENT;
        newAssigneeName = dept.name;
      }
    }

    if (dto.targetSubDepartmentId !== undefined) {
      if (dto.targetSubDepartmentId === null) {
        existing.targetSubDepartment = undefined;
      } else {
        const dept = await this.departmentRepo.findById(
          dto.targetSubDepartmentId,
        );
        if (!dept)
          throw new NotFoundException({ targetSubDepartmentId: 'not_found' });
        existing.targetSubDepartment = dept;
        existing.targetSubDepartmentId = dept.id.toString();
        existing.assignee = undefined;
        existing.targetDepartment = undefined;
        existing.targetDepartmentId = null;
        existing.assigneeId = null;
        existing.assignmentType = TaskAssignmentType.SUB_DEPARTMENT;
        newAssigneeName = dept.name;
      }
    }

    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId === null) {
        existing.assignee = undefined;
      } else {
        const user = await this.employeeRepository.findById(dto.assigneeId, { includeUser: true });
        if (!user) throw new NotFoundException({ assigneeId: 'not_found' });
        existing.assignee = user;
        existing.targetDepartment = undefined;
        existing.targetSubDepartment = undefined;
        existing.targetDepartmentId = null;
        existing.targetSubDepartmentId = null;
        existing.assigneeId = user.id.toString();
        existing.assignmentType = TaskAssignmentType.INDIVIDUAL;
        newAssigneeName = user.user?.name;
      }
    }

    if (dto.approverId !== undefined) {
      if (dto.approverId === null) {
        existing.approver = undefined;
      } else {
        const user = await this.userRepo.findById(dto.approverId);
        if (!user) throw new NotFoundException({ approverId: 'not_found' });
        const approverAdmin = await this.adminRepository.findByUserId(
          dto.approverId,
        );
        const approverSupervisor = await this.supervisorRepository.findByUserId(
          dto.approverId,
        );
        existing.approver = approverAdmin ?? approverSupervisor;
      }
    }

    existing.assignmentType = existing.assignee
      ? TaskAssignmentType.INDIVIDUAL
      : existing.targetDepartment
        ? TaskAssignmentType.DEPARTMENT
        : TaskAssignmentType.SUB_DEPARTMENT;

    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.completedAt !== undefined)
      existing.completedAt = dto.completedAt ?? null;

    // Handle reminder deletions (Sync with Queue)
    if (dto.deleteReminders && dto.deleteReminders.length > 0) {
      for (const reminderId of dto.deleteReminders) {
        await this.reminderQueueService.removeReminder(reminderId);
      }
      existing.reminders = (existing.reminders ?? []).filter(
        (r) => !dto.deleteReminders.includes(r.id),
      );
    }

    // Handle reminder additions (Sync with Queue)
    if (dto.addReminders && dto.addReminders.length > 0) {
      const newReminders = dto.addReminders.map((reminder) => {
        const reminderId = UUID.create().toString();
        return {
          id: reminderId,
          taskId: existing.id.toString(),
          reminderDate: reminder.reminderDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          name: reminder.name,
          reminderInterval: reminder.reminderInterval,
        };
      });

      existing.reminders = [...(existing.reminders ?? []), ...newReminders];

      for (const reminder of newReminders) {
        await this.reminderQueueService.scheduleReminder(
          reminder.id,
          existing.id.toString(),
          reminder.reminderInterval,
          reminder.reminderDate,
        );
      }
    }

    // Handle attachment deletion
    if (dto.deleteAttachments && dto.deleteAttachments.length > 0) {
      await this.deleteAttachmentsUseCase.execute({
        attachmentIds: dto.deleteAttachments,
      });
    }

    const [savedTask, fileHubUploadKey] = await Promise.all([
      this.taskRepo.save(existing),
      dto.attach
        ? this.fileHubService
          .generateUploadToken({
            expiresInMs: 1000 * 60 * 60 * 24,
            targetId: id,
            userId,
          })
          .then((upload) => upload.uploadKey)
        : undefined,
    ]);

    savedTask.assigneeName = newAssigneeName ?? savedTask.assigneeName;

    // Handle attachment cloning (via Domain Event)
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.eventEmitter.emitAsync(
        CloneTaskAttachmentsEvent.name,
        new CloneTaskAttachmentsEvent(id, dto.chooseAttachments),
      );
    }

    return { task: savedTask.toJSON(), fileHubUploadKey };
  }

  private async validateAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) return;

    // Creator always has access
    if (task.creatorId === userId) return;

    if (role === Roles.SUPERVISOR) {
      // Check for hierarchical access to the task's department or assignee
      if (task.assignmentType === TaskAssignmentType.SUB_DEPARTMENT) {
        if (task.targetSubDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetSubDepartmentId,
            );
          if (hasAccess) return;
        }
      } else if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: { supervisorUserId: userId },
              employee: { employeeUserId: task.assigneeId },
            });
          if (hasAccess) return;
        }
      } else if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        if (task.targetDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetDepartmentId,
            );
          if (hasAccess) return;
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const isAssigned = task.assigneeId === userId;
      if (isAssigned) return;

      if (task.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            task.targetSubDepartmentId,
          );
        if (hasAccess) return;
      }
    }

    throw new ForbiddenException('You do not have access to update this task');
  }
}
