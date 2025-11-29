import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { SubmitTaskSubmissionUseCase } from './submit-task-submission.use-case';
import { TaskSubmission } from 'src/task/domain/entities/task-submission.entity';

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

  async execute(dto: SubmitTaskForReviewInputDto): Promise<{
    submission: ReturnType<typeof TaskSubmission.prototype.toJSON>;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
    const result = await this.submitTaskSubmissionUseCase.execute(dto);
    return {
      submission: result.taskSubmission.toJSON(),
      uploadKey: result.uploadKey,
      fileHubUploadKey: result.fileHubUploadKey,
    };
  }
}
