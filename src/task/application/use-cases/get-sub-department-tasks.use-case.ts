import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetSubDepartmentTasksInput {
  subDepartmentId?: string;
  offset?: number;
  limit?: number;
}

interface SubDepartmentTasksResult {
  tasks: Task[];
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
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetSubDepartmentTasksInput,
  ): Promise<SubDepartmentTasksResult> {
    const { subDepartmentId } = input;

    // Use repository's optimized query for sub-department-level tasks
    const tasks =
      await this.taskRepo.findSubDepartmentLevelTasks(subDepartmentId);

    // Get attachments for all tasks
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: tasks.map((task) => task.id.toString()),
    });

    // Get metrics for sub-department-level tasks
    const metrics =
      await this.taskRepo.getTaskMetricsForSubDepartment(subDepartmentId);

    return { tasks, attachments, metrics };
  }
}
