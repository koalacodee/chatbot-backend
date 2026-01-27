import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task, TaskPriority, TaskStatus } from '../../domain/entities/task.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { CursorMeta, PaginatedResult } from 'src/common/drizzle/helpers/cursor';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { TaskSubmission } from 'src/task/domain/entities/task-submission.entity';
import { TaskDelegationSubmission } from 'src/task/domain/entities/task-delegation-submission.entity';
import { FilehubAttachmentMessage } from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

export interface GetTeamTasksForSupervisorInput {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  cursor?: string;
  cursorDir?: 'next' | 'prev';
  limit?: number;
  search?: string;
}

@Injectable()
export class GetTeamTasksForSupervisorUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly fileHubService: FileHubService,
  ) { }

  async execute(
    input: GetTeamTasksForSupervisorInput,
    userId: string,
  ): Promise<PaginatedResult<{
    task: (ReturnType<Task['toJSON']> & {
      submissions: ReturnType<TaskSubmission['toJSON']>[];
      delegationSubmissions: ReturnType<TaskDelegationSubmission['toJSON']>[];
    });
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    fileHubAttachments: FilehubAttachmentMessage[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }> {
    const { status, priority, cursor, cursorDir, limit, search } = input;

    const supervisor = await this.supervisorRepository.findByUserId(userId);
    if (!supervisor) {
      throw new Error('Supervisor not found');
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());

    const result = await this.taskRepository.getTeamTasksForSupervisor({
      supervisorDepartmentIds,
      status,
      priority,
      cursor: cursor ? { cursor, direction: cursorDir ?? 'next', pageSize: limit } : undefined,
      search,
    });

    const signedUrls = await this.fileHubService.getSignedUrlBatch(
      result.fileHubAttachments.map((a) => a.filename),
    );

    const fileHubAttachments = result.fileHubAttachments.map((a) => ({
      ...a.toJSON(),
      signedUrl: signedUrls.find(
        (signedUrl) => signedUrl.filename === a.filename,
      )?.signedUrl,
    }));

    return {
      data: result.data.map((t) => ({
        task: {
          ...t.task.data.toJSON(),
          submissions: t.task.submissions.map((s) => s.toJSON()),
          delegationSubmissions: t.task.delegationSubmissions.map((s) => s.toJSON()),
        },
        rejectionReason: t.task.submissions.find((s) => s.status === 'REJECTED')?.feedback,
        approvalFeedback: t.task.submissions.find((s) => s.status === 'APPROVED')?.feedback,
      })),
      meta: result.meta,
      fileHubAttachments: fileHubAttachments,
      metrics: result.metrics,
    };
  }
}
