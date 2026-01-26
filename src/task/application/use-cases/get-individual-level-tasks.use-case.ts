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
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

interface GetIndividualLevelTasksInput {
  assigneeId?: string;
  departmentId?: string;
  cursor?: string;
  cursorDir?: 'next' | 'prev';
  limit?: number;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
}

interface IndividualLevelTasksResult {
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
export class GetIndividualLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
    private readonly departmentRepository: DepartmentRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) { }

  async execute(
    input: GetIndividualLevelTasksInput,
  ): Promise<IndividualLevelTasksResult> {
    const { assigneeId, departmentId, status, priority, search, cursor, cursorDir, limit } = input;

    const normalizedSearch = search?.trim() || undefined;

    let departmentIds: string[] | undefined;
    if (departmentId) {
      departmentIds = await this.getDepartmentWithChildren(departmentId);
      if (!departmentIds.length) {
        departmentIds = undefined;
      }
    }

    const filters = {
      assigneeId,
      departmentIds,
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      search: normalizedSearch,
      cursor: cursor ? { cursor, direction: cursorDir ?? 'next', pageSize: limit } : undefined,
    };

    const { data: tasks, meta } = await this.taskRepo.findSubIndividualsLevelTasks(filters);

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

    // Get metrics for individual-level tasks
    const metrics = await this.taskRepo.getTaskMetricsForIndividual(filters);

    return { data: tasks, meta, submissions, attachments, fileHubAttachments, metrics };
  }

  private async getDepartmentWithChildren(
    departmentId: string,
  ): Promise<string[]> {
    const queue: string[] = [departmentId];
    const visited = new Set<string>();

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const children =
        await this.departmentRepository.findSubDepartmentByParentId(current);
      for (const child of children) {
        const childId = child.id.toString();
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    return Array.from(visited);
  }
}
