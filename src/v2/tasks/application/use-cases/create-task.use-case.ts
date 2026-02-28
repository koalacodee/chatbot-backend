import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Task,
  TaskAssignmentType,
  TaskPriority,
  TaskReminderOptions,
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
import { TaskPresetCreatedEvent } from '../../domain/events/task-preset-created.event';
import { CloneTaskAttachmentsEvent } from '../../domain/events/clone-task-attachments.event';
import { TaskRemindersCreatedEvent } from '../../domain/events/task-reminders-created.event';
import { TaskCreatedEvent } from '../../domain/events/task-created.event';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { Employee } from '@/employee/domain/entities/employee.entity';
import { Department } from '@/department/domain/entities/department.entity';

interface CreateTaskInputDto {
  title: string;
  description: string;
  dueDate?: Date;
  assignee:
    | {
        assigneeId: string;
        targetDepartmentId: never;
        targetSubDepartmentId: never;
      }
    | {
        targetDepartmentId: string;
        assigneeId: never;
        targetSubDepartmentId: never;
      }
    | {
        targetSubDepartmentId: string;
        assigneeId: never;
        targetDepartmentId: never;
      };
  assignerId: string;
  assignerRole: Roles;
  approverId?: string;
  completedAt?: Date | null;
  priority?: TaskPriority;
  attach?: boolean;
  reminders?: TaskReminderOptions[];
  savePreset?: boolean;
  chooseAttachments?: string[];
  daysBeforeDeadlineReminder?: number;
}

@Injectable()
export class CreateTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    dto: CreateTaskInputDto,
    userId?: string,
  ): Promise<{
    task: ReturnType<typeof Task.prototype.toJSON>;
    fileHubUploadKey?: string;
  }> {
    const assignmentType = dto.assignee.assigneeId
      ? TaskAssignmentType.INDIVIDUAL
      : dto.assignee.targetDepartmentId
        ? TaskAssignmentType.DEPARTMENT
        : dto.assignee.targetSubDepartmentId
          ? TaskAssignmentType.SUB_DEPARTMENT
          : undefined;

    if (!assignmentType) {
      throw new BadRequestException({
        details: [
          {
            field: 'assignee',
            message: 'Invalid assignee',
          },
        ],
      });
    }

    // Security check: Ensure assigner is the requesting user
    if (userId && dto.assignerId !== userId) {
      throw new ForbiddenException({
        details: [
          {
            field: 'assignerId',
            message: 'You can only create tasks as yourself',
          },
        ],
      });
    }

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkDepartmentAccess(userId, dto, userRole, assignmentType);
    }

    const [
      assignee,
      assigner,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ]: [
      Employee | null,
      Admin | Supervisor | null,
      Admin | null,
      Supervisor | null,
      Department | null,
      Department | null,
    ] = await Promise.all([
      dto.assignee.assigneeId
        ? this.employeeRepository.findById(dto.assignee.assigneeId, {
            includeUser: true,
          })
        : Promise.resolve(null),
      dto.assignerRole === Roles.ADMIN
        ? this.adminRepository.findByUserId(dto.assignerId)
        : this.supervisorRepository.findByUserId(dto.assignerId),
      dto.approverId
        ? this.adminRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.approverId
        ? this.supervisorRepository.findByUserId(dto.approverId)
        : Promise.resolve(null),
      dto.assignee.targetDepartmentId
        ? this.departmentRepo.findById(dto.assignee.targetDepartmentId)
        : Promise.resolve(null),
      dto.assignee.targetSubDepartmentId
        ? this.departmentRepo.findById(dto.assignee.targetSubDepartmentId)
        : Promise.resolve(null),
    ]);

    if (dto.assignee.assigneeId && !assignee)
      throw new NotFoundException({ assigneeId: 'not_found' });
    if (!assigner) throw new NotFoundException({ assignerId: 'not_found' });
    if (dto.approverId && !approverAdmin && !approverSupervisor)
      throw new NotFoundException({
        details: [{ field: 'approverId', message: 'Approver not found' }],
      });
    if (dto.assignee.targetDepartmentId && !targetDepartment)
      throw new NotFoundException({
        details: [
          {
            field: 'targetDepartmentId',
            message: 'Target department not found',
          },
        ],
      });
    if (dto.assignee.targetSubDepartmentId && !targetSubDepartment)
      throw new NotFoundException({
        details: [
          {
            field: 'targetSubDepartmentId',
            message: 'Target sub-department not found',
          },
        ],
      });

    if (!userId) {
      throw new BadRequestException({
        details: [
          {
            field: 'userId',
            message: 'userId is required to track task creator',
          },
        ],
      });
    }

    const assigneeName =
      assignmentType === TaskAssignmentType.INDIVIDUAL
        ? assignee?.user?.name
        : assignmentType === TaskAssignmentType.DEPARTMENT
          ? targetDepartment?.name
          : targetSubDepartment?.name;

    const task = Task.create({
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
      assignee: assignee ?? undefined,
      assigner: assigner,
      approver: approverAdmin ?? approverSupervisor,
      creatorId: userId,
      assignmentType,
      targetDepartment:
        !assignee && !targetSubDepartment ? targetDepartment : undefined,
      targetSubDepartment: !assignee ? targetSubDepartment : undefined,
      status: TaskStatus.TODO,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      completedAt: dto.completedAt ?? undefined,
      reminders: dto.reminders,
      targetSubDepartmentId: dto.assignee.targetSubDepartmentId,
      targetDepartmentId: dto.assignee.targetDepartmentId,
      assigneeId: dto.assignee.assigneeId,
      daysBeforeDeadlineReminder: dto.daysBeforeDeadlineReminder,
    });

    const [saved, fileHubUploadKey] = await Promise.all([
      this.taskRepo.save(task),
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: task.id.toString(),
              userId,
            })
            .then((upload) => upload.uploadKey)
        : undefined,
    ]);

    // Emit events
    await this.eventEmitter.emitAsync(
      TaskCreatedEvent.name,
      new TaskCreatedEvent(
        saved.id,
        saved.title,
        assignmentType,
        assignee?.userId?.toString(),
        dto.assignee.targetDepartmentId,
        dto.assignee.targetSubDepartmentId,
        saved.createdAt,
      ),
    );

    if (dto.savePreset) {
      if (
        dto.assignerRole === Roles.ADMIN ||
        dto.assignerRole === Roles.SUPERVISOR
      ) {
        await this.eventEmitter.emitAsync(
          TaskPresetCreatedEvent.name,
          new TaskPresetCreatedEvent(
            saved.id,
            dto.assignerId,
            dto.assignerRole,
            `${saved.title} - Preset`,
          ),
        );
      }
    }

    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.eventEmitter.emitAsync(
        CloneTaskAttachmentsEvent.name,
        new CloneTaskAttachmentsEvent(saved.id, dto.chooseAttachments),
      );
    }

    if (dto.reminders && saved.reminders && saved.reminders.length > 0) {
      await this.eventEmitter.emitAsync(
        TaskRemindersCreatedEvent.name,
        new TaskRemindersCreatedEvent(
          saved.id,
          saved.reminders.map((r) => ({
            id: r.id,
            interval: r.reminderInterval,
            dueDate: r.reminderDate,
          })),
          saved.daysBeforeDeadlineReminder ?? 0,
        ),
      );
    }

    saved.assigneeName = assigneeName;

    return { task: saved.toJSON(), fileHubUploadKey };
  }

  private async checkDepartmentAccess(
    userId: string,
    dto: CreateTaskInputDto,
    role: Roles,
    assignmentType: TaskAssignmentType,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins can create tasks for any department
    }

    if (role === Roles.SUPERVISOR) {
      // Supervisors cannot create department-level tasks
      if (assignmentType === TaskAssignmentType.DEPARTMENT) {
        throw new ForbiddenException(
          'Supervisors can only create individual tasks and sub-department tasks',
        );
      }

      // For individual tasks, check if assignee is supervised by this supervisor
      if (
        assignmentType === TaskAssignmentType.INDIVIDUAL &&
        dto.assignee.assigneeId
      ) {
        const hasAccess =
          await this.employeeRepository.supervisorHasAccessToEmployee({
            supervisor: { supervisorUserId: userId },
            employee: { employeeId: dto.assignee.assigneeId },
          });

        if (!hasAccess) {
          throw new ForbiddenException(
            'You can only assign tasks to employees you directly supervise',
          );
        }
      }

      // For sub-department tasks, check sub-department access through parent
      if (
        assignmentType === TaskAssignmentType.SUB_DEPARTMENT &&
        dto.assignee.targetSubDepartmentId
      ) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            dto.assignee.targetSubDepartmentId,
          );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to create tasks for this sub-department',
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      // Employees typically shouldn't create tasks, but if they can, limit to their own tasks
      if (
        assignmentType === TaskAssignmentType.INDIVIDUAL &&
        dto.assignee.assigneeId
      ) {
        // Employees can only assign tasks to themselves
        if (dto.assignee.assigneeId !== userId) {
          throw new ForbiddenException({
            details: [
              {
                field: 'assigneeId',
                message: 'You can only assign tasks to yourself',
              },
            ],
          });
        }
      } else {
        // Employees cannot create department-wide tasks
        throw new ForbiddenException(
          'You do not have permission to create department-wide tasks',
        );
      }
    }
  }
}
