import { Injectable } from '@nestjs/common';
import { SubmitTaskSubmissionUseCase } from './submit-task-submission.use-case';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';

interface SubmitTaskForReviewInputDto {
  taskId: string;
  submittedBy: string;
  notes?: string;
  attach?: boolean;
  chooseAttachments?: string[];
}

@Injectable()
export class SubmitTaskForReviewUseCase {
  constructor(
    private readonly submitTaskSubmissionUseCase: SubmitTaskSubmissionUseCase,
  ) {}

  async execute(dto: SubmitTaskForReviewInputDto): Promise<{
    submission: ReturnType<typeof TaskSubmission.prototype.toJSON>;
    fileHubUploadKey?: string;
  }> {
    const result = await this.submitTaskSubmissionUseCase.execute(dto);
    return {
      submission: result.taskSubmission,
      fileHubUploadKey: result.fileHubUploadKey,
    };
  }
}
