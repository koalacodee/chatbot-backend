import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetDepartmentLevelTasksInput {
  departmentId?: string;
  offset?: number;
  limit?: number;
}

interface DepartmentLevelTasksResult {
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
export class GetDepartmentLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetDepartmentLevelTasksInput,
  ): Promise<DepartmentLevelTasksResult> {
    const { departmentId } = input;

    // Use repository's optimized query for department-level tasks
    const tasks = await this.taskRepo.findDepartmentLevelTasks(departmentId);

    // Get attachments and submissions for all tasks
    const [attachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: tasks.map((task) => task.id.toString()),
      }),
      this.taskSubmissionRepo.findByTaskIds(
        tasks.map((task) => task.id.toString()),
      ),
    ]);

    // Get metrics for department-level tasks
    const metrics =
      await this.taskRepo.getTaskMetricsForDepartment(departmentId);

    return { tasks, submissions, attachments, metrics };
  }
}
