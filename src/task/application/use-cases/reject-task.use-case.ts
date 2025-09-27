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

    // Find the task submission
    const taskSubmission = await this.taskSubmissionRepo.findByTaskId(
      dto.taskId,
    );
    if (!taskSubmission) {
      throw new NotFoundException('No submission found for this task');
    }

    // Reject the task submission
    const rejectedSubmission = await this.rejectTaskSubmissionUseCase.execute(
      {
        taskSubmissionId: taskSubmission.id.toString(),
        feedback: dto.feedback,
      },
      userId,
    );

    return rejectedSubmission.task;
  }
}
