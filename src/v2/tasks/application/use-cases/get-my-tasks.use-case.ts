import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { CursorInput } from '@/common/drizzle/helpers/cursor';
import { TaskPriority, TaskStatus } from '../../domain/entities/task.entity';
import { Task } from '@/v2/tasks/domain/entities/task.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

interface UnifiedMyTaskItemResult {
  type: 'task' | 'delegation';
  taskId: string;
  delegationId?: string;
  task: ReturnType<typeof Task.prototype.toJSON>;
  rejectionReason?: string;
  approvalFeedback?: string;
  submissions?: ReturnType<
    import('@/v2/tasks/domain/entities/task-delegation-submission.entity').TaskDelegationSubmission['toJSON']
  >[];
}

interface MyTasksResult {
  data: UnifiedMyTaskItemResult[];
  meta: any;
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
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
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
        type: 'task' as const,
        taskId: t.task.id,
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
      data: unifiedItems,
      meta,
      metrics,
    } = await this.taskRepo.getUnifiedMyTasksForEmployee({
      employeeUserId: dto.userId,
      status: dto.status ? [dto.status] : undefined,
      priority: dto.priority ? [dto.priority] : undefined,
      cursor: dto.cursor,
      search: dto.search,
      subDepartmentId: dto.subDepartmentId,
    });

    const delegationIds = unifiedItems
      .filter((i) => i.type === 'delegation' && i.delegationId)
      .map((i) => i.delegationId!);
    const allTaskIds = unifiedItems.map((i) => i.taskId);

    const [fileHubAttachments, delegationSubmissionsList] = await Promise.all([
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: [...new Set(allTaskIds)],
        expiresInMs: 1000 * 60 * 60 * 24,
      }),
      delegationIds.length > 0
        ? this.taskDelegationSubmissionRepo.findByDelegationIds(delegationIds)
        : Promise.resolve([]),
    ]);

    const submissionsMap = new Map<string, typeof delegationSubmissionsList>();
    for (const s of delegationSubmissionsList) {
      const list = submissionsMap.get(s.delegationId) ?? [];
      list.push(s);
      submissionsMap.set(s.delegationId, list);
    }

    const data: UnifiedMyTaskItemResult[] = unifiedItems.map((item) => {
      const taskJson = item.task.toJSON();
      if (item.statusOverride) {
        (taskJson as Record<string, unknown>).status = item.statusOverride;
      }
      const result: UnifiedMyTaskItemResult = {
        type: item.type,
        taskId: item.taskId,
        task: taskJson,
        rejectionReason: item.rejectionReason,
        approvalFeedback: item.approvalFeedback,
      };
      if (item.delegationId) {
        result.delegationId = item.delegationId;
        const subs = submissionsMap.get(item.delegationId);
        if (subs?.length) {
          result.submissions = subs.map((s) => s.toJSON());
          const rejected = subs.find((s) => s.status === 'REJECTED');
          const approved = subs.find((s) => s.status === 'APPROVED');
          if (rejected?.feedback) result.rejectionReason = rejected.feedback;
          if (approved?.feedback) result.approvalFeedback = approved.feedback;
        }
      }
      return result;
    });

    return {
      data,
      meta,
      fileHubAttachments,
      metrics,
    };
  }
}
