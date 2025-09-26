import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetIndividualLevelTasksInput {
  assigneeId?: string;
  offset?: number;
  limit?: number;
}

interface IndividualLevelTasksResult {
  tasks: Task[];
  attachments: { [taskId: string]: string[] };
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
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetIndividualLevelTasksInput,
  ): Promise<IndividualLevelTasksResult> {
    const tasks = await this.taskRepo.findSubIndividualsLevelTasks(
      input.assigneeId,
    );

    // Get attachments for all tasks
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: tasks.map((task) => task.id.toString()),
    });

    // Get metrics for individual-level tasks
    const metrics = await this.taskRepo.getTaskMetricsForIndividual(
      input.assigneeId,
    );

    return { tasks, attachments, metrics };
  }
}
