import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { ApproveTaskSubmissionUseCase } from './approve-task-submission.use-case';

interface ApproveTaskInputDto {
  taskId: string;
}

@Injectable()
export class ApproveTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly approveTaskSubmissionUseCase: ApproveTaskSubmissionUseCase,
  ) {}

  async execute(dto: ApproveTaskInputDto, userId?: string): Promise<Task> {
    const task = await this.taskRepo.findById(dto.taskId);
    if (!task)
      throw new NotFoundException({
        details: [{ field: 'taskId', message: 'Task not found' }],
      });

    // Find all pending task submissions
    const taskSubmissions = await this.taskSubmissionRepo.findByTaskId(
      dto.taskId,
    );
    const pendingSubmissions = taskSubmissions.filter(
      (submission) => submission.status === 'SUBMITTED',
    );

    if (pendingSubmissions.length === 0) {
      throw new NotFoundException({
        details: [
          {
            field: 'taskId',
            message: 'No pending submissions found for this task',
          },
        ],
      });
    }

    // Approve all pending submissions
    const approvedSubmissions = await Promise.all(
      pendingSubmissions.map((submission) =>
        this.approveTaskSubmissionUseCase.execute(
          { taskSubmissionId: submission.id.toString() },
          userId,
        ),
      ),
    );

    return approvedSubmissions[0].taskSubmission.task;
  }
}
