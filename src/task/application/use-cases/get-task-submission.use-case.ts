import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(taskSubmissionId: string): Promise<{
    taskSubmission: TaskSubmission;
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    const taskSubmission =
      await this.taskSubmissionRepo.findById(taskSubmissionId);

    if (!taskSubmission) {
      throw new NotFoundException('Task submission not found');
    }

    // Get attachments for this task submission
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [taskSubmission.id.toString()],
    });

    return { taskSubmission, attachments };
  }

  async executeByTaskId(taskId: string): Promise<{
    taskSubmissions: TaskSubmission[];
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    const taskSubmissions = await this.taskSubmissionRepo.findByTaskId(taskId);

    // Get attachments for all task submissions
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: taskSubmissions.map((submission) => submission.id.toString()),
    });

    return { taskSubmissions, attachments };
  }
}
