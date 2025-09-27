import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';

@Injectable()
export class GetTaskSubmissionUseCase {
  constructor(private readonly taskSubmissionRepo: TaskSubmissionRepository) {}

  async execute(taskSubmissionId: string): Promise<TaskSubmission> {
    const taskSubmission =
      await this.taskSubmissionRepo.findById(taskSubmissionId);

    if (!taskSubmission) {
      throw new NotFoundException('Task submission not found');
    }

    return taskSubmission;
  }

  async executeByTaskId(taskId: string): Promise<TaskSubmission | null> {
    return this.taskSubmissionRepo.findByTaskId(taskId);
  }
}
