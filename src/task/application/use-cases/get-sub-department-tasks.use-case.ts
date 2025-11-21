import { Injectable } from '@nestjs/common';
import { Task, TaskPriority, TaskStatus } from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetSubDepartmentTasksInput {
  subDepartmentId?: string;
  offset?: number;
  limit?: number;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
}

interface SubDepartmentTasksResult {
  tasks: Task[];
  submissions: TaskSubmission[];
  attachments: { [taskId: string]: string[] };
  metrics: {
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  };
}

@Injectable()
export class GetSubDepartmentTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) { }

  async execute(
    input: GetSubDepartmentTasksInput,
  ): Promise<SubDepartmentTasksResult> {
    const { subDepartmentId, status, priority, search } = input;
    const normalizedSearch = search?.trim() || undefined;
    const filters = {
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      search: normalizedSearch,
    };

    // Use repository's optimized query for sub-department-level tasks
    const tasks = await this.taskRepo.findSubDepartmentLevelTasks(
      subDepartmentId,
      filters,
    );

    // Get attachments and submissions for all tasks
    const [attachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: tasks.map((task) => task.id.toString()),
      }),
      this.taskSubmissionRepo.findByTaskIds(
        tasks.map((task) => task.id.toString()),
      ),
    ]);

    // Get metrics for sub-department-level tasks
    const metrics = await this.taskRepo.getTaskMetricsForSubDepartment(
      subDepartmentId,
      filters,
    );

    return { tasks, submissions, attachments, metrics };
  }
}
