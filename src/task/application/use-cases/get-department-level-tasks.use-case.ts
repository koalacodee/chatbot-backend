import { Injectable } from '@nestjs/common';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

interface GetDepartmentLevelTasksInput {
  departmentId?: string;
  cursor?: string;
  cursorDir?: 'next' | 'prev';
  limit?: number;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
}

interface DepartmentLevelTasksResult {
  data: Task[];
  meta: any;
  submissions: TaskSubmission[];
  attachments: { [taskId: string]: string[] };
  fileHubAttachments: FilehubAttachmentMessage[];
  metrics: {
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  };
}

@Injectable()
export class GetDepartmentLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) { }

  async execute(
    input: GetDepartmentLevelTasksInput,
  ): Promise<DepartmentLevelTasksResult> {
    const { departmentId, status, priority, search, cursor, cursorDir, limit } = input;
    const normalizedSearch = search?.trim() || undefined;

    const filters = {
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      search: normalizedSearch,
      cursor: cursor ? { cursor, direction: cursorDir ?? 'next', pageSize: limit } : undefined,
    };

    // Use repository's optimized query for department-level tasks
    const { data: tasks, meta } = await this.taskRepo.findDepartmentLevelTasks(
      departmentId,
      filters,
    );

    const taskIds = tasks.map((task) => task.id.toString());

    // Get attachments, submissions and filehub attachments for all tasks
    const [attachments, submissions, fileHubAttachments] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: taskIds,
      }),
      this.taskSubmissionRepo.findByTaskIds(taskIds),
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: taskIds,
      }),
    ]);

    // Get metrics for department-level tasks
    const metrics = await this.taskRepo.getTaskMetricsForDepartment(
      departmentId,
      filters,
    );

    return { data: tasks, meta, submissions, attachments, fileHubAttachments, metrics };
  }
}
