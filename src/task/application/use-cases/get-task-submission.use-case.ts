import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from 'src/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(taskSubmissionId: string): Promise<{
    taskSubmission: TaskSubmission;
    attachments: { [taskSubmissionId: string]: string[] };
    fileHubAttachments: FilehubAttachmentMessage[];
  }> {
    const taskSubmission =
      await this.taskSubmissionRepo.findById(taskSubmissionId);

    if (!taskSubmission) {
      throw new NotFoundException({
        details: [
          { field: 'taskSubmissionId', message: 'Task submission not found' },
        ],
      });
    }

    const targetIds = [taskSubmission.id.toString()];

    // Get attachments and filehub attachments for this task submission
    const [attachments, fileHubAttachments] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds,
      }),
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds,
      }),
    ]);

    return { taskSubmission, attachments, fileHubAttachments };
  }

  async executeByTaskId(taskId: string): Promise<{
    taskSubmissions: TaskSubmission[];
    delegationSubmissions: TaskDelegationSubmission[];
    attachments: { [taskSubmissionId: string]: string[] };
    fileHubAttachments: FilehubAttachmentMessage[];
  }> {
    const [taskSubmissions, allDelegationSubmissions] = await Promise.all([
      this.taskSubmissionRepo.findByTaskId(taskId),
      this.taskDelegationSubmissionRepository.findByTaskId(taskId, true),
    ]);

    // Combine task submission IDs and delegation submission IDs for attachments/filehub
    const allSubmissionIds = [
      ...taskSubmissions.map((submission) => submission.id.toString()),
      ...allDelegationSubmissions.map((submission) => submission.id.toString()),
    ];

    // Get attachments and filehub attachments for all submissions
    const [attachments, fileHubAttachments] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: allSubmissionIds,
      }),
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: allSubmissionIds,
      }),
    ]);

    return {
      taskSubmissions,
      delegationSubmissions: allDelegationSubmissions,
      attachments,
      fileHubAttachments,
    };
  }
}
