import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskStatus } from '../../domain/entities/task.entity';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface GetMyTasksInputDto {
  userId: string;
  cursor?: string;
  cursorDir?: 'next' | 'prev';
  limit?: number;
  status?: TaskStatus;
}

export interface MyTasksResult {
  data: Array<
    ReturnType<Task['toJSON']> & {
      rejectionReason?: string;
      approvalFeedback?: string;
    }
  >;
  meta: any;
  delegations?: TaskDelegation[];
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
    private readonly fileHubService: FileHubService,
  ) { }

  async execute(dto: GetMyTasksInputDto): Promise<MyTasksResult> {
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

  private async getSupervisorTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const { data: tasks, meta, fileHubAttachments: rawAttachments, metrics } = await this.taskRepo.getTasksForSupervisor({
      supervisorUserId: dto.userId,
      status: dto.status ? [dto.status] : undefined,
      cursor: dto.cursor ? { cursor: dto.cursor, direction: dto.cursorDir ?? 'next', pageSize: dto.limit } : undefined,
    });

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      rawAttachments.map((a) => a.filename),
    );

    const fileHubAttachments = rawAttachments.map((a) => ({
      ...a.toJSON(),
      signedUrl: signedUrls.find(
        (signedUrl) => signedUrl.filename === a.filename,
      )?.signedUrl,
    }));

    return {
      data: tasks.map((t) => ({
        ...t.task.toJSON(),
        rejectionReason: t.rejectionReason,
        approvalFeedback: t.approvalFeedback,
      })),
      meta,
      fileHubAttachments,
      metrics: metrics,
    };
  }

  private async getEmployeeTasks(
    dto: GetMyTasksInputDto,
  ): Promise<MyTasksResult> {
    const { data: tasks, meta, delegations, fileHubAttachments: rawAttachments, metrics } = await this.taskRepo.getTasksAndDelegationsForEmployee({
      employeeUserId: dto.userId,
      status: dto.status ? [dto.status] : undefined,
      cursor: dto.cursor ? { cursor: dto.cursor, direction: dto.cursorDir ?? 'next', pageSize: dto.limit } : undefined,
    });

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      rawAttachments.map((a) => a.filename),
    );

    const fileHubAttachments = rawAttachments.map((a) => ({
      ...a.toJSON(),
      signedUrl: signedUrls.find(
        (signedUrl) => signedUrl.filename === a.filename,
      )?.signedUrl,
    }));

    return {
      data: tasks.map((t) => ({
        ...t.task.toJSON(),
        rejectionReason: t.rejectionReason,
        approvalFeedback: t.approvalFeedback,
      })),
      meta,
      delegations: delegations,
      fileHubAttachments,
      metrics: {
        pendingTasks:
          metrics.pendingTasks + metrics.pendingDelegations,
        completedTasks:
          metrics.completedTasks + metrics.completedDelegations,
        taskCompletionPercentage: Math.floor(metrics.totalPercentage),
      },
    };
  }
}
