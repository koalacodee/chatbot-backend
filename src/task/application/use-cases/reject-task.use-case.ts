import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { RejectTaskSubmissionUseCase } from './reject-task-submission.use-case';

interface RejectTaskInputDto {
  taskId: string;
  feedback?: string;
}

@Injectable()
export class RejectTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly rejectTaskSubmissionUseCase: RejectTaskSubmissionUseCase,
  ) {}

  async execute(dto: RejectTaskInputDto, userId?: string): Promise<Task> {
    const task = await this.taskRepo.findById(dto.taskId);
    if (!task) throw new NotFoundException({ id: 'task_not_found' });

    // Find all pending task submissions
    const taskSubmissions = await this.taskSubmissionRepo.findByTaskId(
      dto.taskId,
    );
    const pendingSubmissions = taskSubmissions.filter(
      (submission) => submission.status === 'SUBMITTED',
    );

    if (pendingSubmissions.length === 0) {
      throw new NotFoundException('No pending submissions found for this task');
    }

    // Reject all pending submissions
    const rejectedSubmissions = await Promise.all(
      pendingSubmissions.map((submission) =>
        this.rejectTaskSubmissionUseCase.execute(
          {
            taskSubmissionId: submission.id.toString(),
            feedback: dto.feedback,
          },
          userId,
        ),
      ),
    );

    return rejectedSubmissions[0].taskSubmission.task;
  }
}
