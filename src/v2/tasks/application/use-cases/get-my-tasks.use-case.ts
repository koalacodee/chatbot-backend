import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { FileHubService } from '@/filehub/domain/services/filehub.service';
import { Attachment } from '@/filehub/domain/entities/attachment.entity';
import { CursorInput } from '@/common/drizzle/helpers/cursor';
import { TaskPriority, TaskStatus } from '../../domain/entities/task.entity';
import { Task } from '@/v2/tasks/domain/entities/task.entity';
import { TaskDelegation } from '@/v2/tasks/domain/entities/task-delegation.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

interface MyTasksResult {
  data: Array<{
    task: ReturnType<typeof Task.prototype.toJSON>;
    rejectionReason?: string;
    approvalFeedback?: string;
  }>;
  meta: any;
  delegations?: Array<ReturnType<typeof TaskDelegation.prototype.toJSON>>;
  fileHubAttachments: FilehubAttachmentMessage[];
  metrics: {
    pendingTasks: number;
    completedTasks: number;
    taskCompletionPercentage: number;
  };
}

@Injectable()
export class GetMyTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(dto: {
    userId: string;
    cursor?: CursorInput;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    departmentId?: string;
    subDepartmentId?: string;
  }): Promise<MyTasksResult> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    const userRole = user.role.getRole();

    switch (userRole) {
      case Roles.SUPERVISOR:
        return this.getSupervisorTasks(dto);
      case Roles.EMPLOYEE:
        return this.getEmployeeTasks(dto);
      case Roles.ADMIN:
        throw new ForbiddenException({
          details: [
            { field: 'role', message: 'Admins do not have my-tasks endpoint' },
          ],
        });
      default:
        throw new ForbiddenException({
          details: [{ field: 'role', message: 'Invalid user role' }],
        });
    }
  }

  private async getSupervisorTasks(dto: {
    userId: string;
    cursor?: CursorInput;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    departmentId?: string;
  }): Promise<MyTasksResult> {
    const {
      data: tasks,
      meta,
      metrics,
    } = await this.taskRepo.getTasksForSupervisor({
      supervisorUserId: dto.userId,
      status: dto.status ? [dto.status] : undefined,
      priority: dto.priority ? [dto.priority] : undefined,
      cursor: dto.cursor,
      search: dto.search,
      departmentId: dto.departmentId,
    });

    const fileHubAttachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: tasks.map((t) => t.task.id),
        expiresInMs: 1000 * 60 * 60 * 24,
      });

    return {
      data: tasks.map((t) => ({
        task: t.task.toJSON(),
        rejectionReason: t.rejectionReason,
        approvalFeedback: t.approvalFeedback,
      })),
      meta,
      fileHubAttachments,
      metrics,
    };
  }

  private async getEmployeeTasks(dto: {
    userId: string;
    cursor?: CursorInput;
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    subDepartmentId?: string;
  }): Promise<MyTasksResult> {
    const {
      data: tasks,
      meta,
      delegations,
      metrics,
    } = await this.taskRepo.getTasksAndDelegationsForEmployee({
      employeeUserId: dto.userId,
      status: dto.status ? [dto.status] : undefined,
      priority: dto.priority ? [dto.priority] : undefined,
      cursor: dto.cursor,
      search: dto.search,
      subDepartmentId: dto.subDepartmentId,
    });

    const fileHubAttachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: tasks.map((t) => t.task.id),
        expiresInMs: 1000 * 60 * 60 * 24,
      });

    return {
      data: tasks.map((t) => ({
        task: t.task.toJSON(),
        rejectionReason: t.rejectionReason,
        approvalFeedback: t.approvalFeedback,
      })),
      meta,
      delegations: delegations.map((d) => d.toJSON()),
      fileHubAttachments,
      metrics: {
        pendingTasks: metrics.pendingTasks + metrics.pendingDelegations,
        completedTasks: metrics.completedTasks + metrics.completedDelegations,
        taskCompletionPercentage: Math.floor(metrics.totalPercentage),
      },
    };
  }
}
