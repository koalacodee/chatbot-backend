import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { SubmitTaskSubmissionUseCase } from './submit-task-submission.use-case';

interface SubmitTaskForReviewInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string; // optional notes to store on the task (assigner notes per schema)
  attach?: boolean;
}

@Injectable()
export class SubmitTaskForReviewUseCase {
  constructor(
    private readonly submitTaskSubmissionUseCase: SubmitTaskSubmissionUseCase,
  ) {}

  async execute(
    dto: SubmitTaskForReviewInputDto,
  ): Promise<{ task: Task; uploadKey?: string }> {
    const result = await this.submitTaskSubmissionUseCase.execute(dto);
    return {
      task: result.taskSubmission.task,
      uploadKey: result.uploadKey,
    };
  }
}
