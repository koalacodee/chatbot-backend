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
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { TaskCreatedEvent } from '../../domain/events/task-created.event';
import { TaskPresetCreatedEvent } from '../../domain/events/task-preset-created.event';
import { FilesService } from 'src/files/domain/services/files.service';
import { ReminderQueueService } from '../../infrastructure/queues/reminder.queue';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface CreateTaskInputDto {
  title: string;
  description: string;
  dueDate?: Date;
  assigneeId?: string;
  assignerId: string;
  assignerRole: Roles;
  approverId?: string;
  status: any; // TaskStatus
  assignmentType: TaskAssignmentType;
  targetDepartmentId?: string;
  targetSubDepartmentId?: string;
  completedAt?: Date | null;
  priority?: TaskPriority;
  attach?: boolean;
  reminderInterval?: number; // in milliseconds
  savePreset?: boolean;
  chooseAttachments?: string[];
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
    private readonly notificationRepository: NotificationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
    private readonly reminderQueueService: ReminderQueueService,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    dto: CreateTaskInputDto,
    userId?: string,
  ): Promise<{
    task: ReturnType<typeof Task.prototype.toJSON>;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
    // Validate required fields based on assignment type
    const validationErrors: any = {};

    if (!dto.assignerId) validationErrors.assignerId = 'required';

    // Validate assignment type specific requirements
    switch (dto.assignmentType) {
      case 'INDIVIDUAL':
        if (!dto.assigneeId) validationErrors.assigneeId = 'required';
        break;
      case 'DEPARTMENT':
        if (!dto.targetDepartmentId)
          validationErrors.targetDepartmentId = 'required';
        break;
      case 'SUB_DEPARTMENT':
        if (!dto.targetSubDepartmentId)
          validationErrors.targetSubDepartmentId = 'required';
        break;
    }

    if (Object.keys(validationErrors).length > 0) {
      const details = Object.entries(validationErrors).map(
        ([field, message]) => ({
          field,
          message: `${field} is ${message}`,
        }),
      );
      throw new BadRequestException({ details });
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
      await this.checkDepartmentAccess(userId, dto, userRole);
    }

    const [
      assignee,
      assigner,
      approverAdmin,
      approverSupervisor,
      targetDepartment,
      targetSubDepartment,
    ] = await Promise.all([
      dto.assigneeId
        ? this.employeeRepository.findById(dto.assigneeId)
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
      dto.targetDepartmentId
        ? this.departmentRepo.findById(dto.targetDepartmentId)
        : Promise.resolve(null),
      dto.targetSubDepartmentId
        ? this.departmentRepo.findById(dto.targetSubDepartmentId)
        : Promise.resolve(null),
    ]);

    if (dto.assigneeId && !assignee)
      throw new NotFoundException({ assigneeId: 'not_found' });
    if (!assigner) throw new NotFoundException({ assignerId: 'not_found' });
    if (dto.approverId && !approverAdmin && !approverSupervisor)
      throw new NotFoundException({
        details: [{ field: 'approverId', message: 'Approver not found' }],
      });
    if (dto.targetDepartmentId && !targetDepartment)
      throw new NotFoundException({
        details: [
          {
            field: 'targetDepartmentId',
            message: 'Target department not found',
          },
        ],
      });
    if (dto.targetSubDepartmentId && !targetSubDepartment)
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

    const task = Task.create({
      id: UUID.create().toString(),
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate,
      assignee: assignee ?? undefined,
      assigner: assigner,
      approver: approverAdmin ?? approverSupervisor,
      creatorId: userId,
      assignmentType: dto.assignmentType,
      targetDepartment:
        !assignee && !targetSubDepartment ? targetDepartment : undefined,
      targetSubDepartment: !assignee ? targetSubDepartment : undefined,
      status: dto.status,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      completedAt: dto.completedAt ?? undefined,
      reminderInterval: dto.reminderInterval ?? undefined,
    });

    const [saved, uploadKey, fileHubUploadKey] = await Promise.all([
      this.taskRepo.save(task),
      dto.attach
        ? this.filesService.genUploadKey(task.id.toString(), userId)
        : undefined,
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: task.id.toString(),
              userId,
            })
            .then((upload) => upload.uploadKey)
        : undefined,
      this.eventEmitter.emitAsync(
        TaskCreatedEvent.name,
        new TaskCreatedEvent(
          task.id.toString(),
          task.title,
          dto.assignmentType,
          assignee?.userId?.toString() ?? undefined,
          dto.targetDepartmentId,
          dto.targetSubDepartmentId,
          task.createdAt,
        ),
      ),
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: saved.id.toString(),
      });
    }

    // Schedule reminder job if reminderInterval is provided
    if (dto.reminderInterval) {
      await this.reminderQueueService.scheduleReminder(
        saved.id.toString(),
        dto.reminderInterval,
      );
    }

    // Emit preset creation event if savePreset is true
    if (dto.savePreset) {
      await this.eventEmitter.emitAsync(
        TaskPresetCreatedEvent.name,
        new TaskPresetCreatedEvent(
          saved.id.toString(),
          dto.assignerId,
          dto.assignerRole.toString(),
          `${saved.title} - Preset`,
        ),
      );
    }

    return { task: saved, uploadKey, fileHubUploadKey };
  }

  private async checkDepartmentAccess(
    userId: string,
    dto: CreateTaskInputDto,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins can create tasks for any department
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);

      // Supervisors cannot create department-level tasks
      if (dto.assignmentType === 'DEPARTMENT') {
        throw new ForbiddenException(
          'Supervisors can only create individual tasks and sub-department tasks',
        );
      }

      // For individual tasks, check if assignee is supervised by this supervisor
      if (dto.assignmentType === 'INDIVIDUAL' && dto.assigneeId) {
        const assignee = await this.employeeRepository.findById(dto.assigneeId);
        if (!assignee) {
          throw new NotFoundException({ assigneeId: 'not_found' });
        }

        if (assignee.supervisorId.toString() !== supervisor.id.toString()) {
          throw new ForbiddenException(
            'You can only assign tasks to employees you directly supervise',
          );
        }
      }

      // For sub-department tasks, check sub-department access through parent
      if (
        dto.assignmentType === 'SUB_DEPARTMENT' &&
        dto.targetSubDepartmentId
      ) {
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to the sub-department through parent department
        const hasAccess = await this.departmentRepo.validateDepartmentAccess(
          dto.targetSubDepartmentId,
          supervisorDepartmentIds,
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to create tasks for this sub-department',
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      // Employees typically shouldn't create tasks, but if they can, limit to their own tasks
      if (dto.assignmentType === 'INDIVIDUAL' && dto.assigneeId) {
        // Employees can only assign tasks to themselves
        if (dto.assigneeId !== userId) {
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
