import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) { }

  async execute(taskSubmissionId: string): Promise<{
    taskSubmission: TaskSubmission;
    attachments: { [taskSubmissionId: string]: string[] };
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

    // Get attachments for this task submission
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [taskSubmission.id.toString()],
    });

    return { taskSubmission, attachments };
  }

  async executeByTaskId(taskId: string): Promise<{
    taskSubmissions: TaskSubmission[];
    delegationSubmissions: TaskDelegationSubmission[];
    attachments: { [taskSubmissionId: string]: string[] };
  }> {
    const [taskSubmissions, allDelegationSubmissions] = await Promise.all([
      this.taskSubmissionRepo.findByTaskId(taskId),
      this.taskDelegationSubmissionRepository.findByTaskId(taskId, true),
    ]);

    // Combine task submission IDs and delegation submission IDs for attachments
    const allSubmissionIds = [
      ...taskSubmissions.map((submission) => submission.id.toString()),
      ...allDelegationSubmissions.map((submission) =>
        submission.id.toString(),
      ),
    ];

    // Get attachments for all submissions (both task submissions and forwarded delegation submissions)
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: allSubmissionIds,
    });

    return {
      taskSubmissions,
      delegationSubmissions: allDelegationSubmissions,
      attachments,
    };
  }
}
