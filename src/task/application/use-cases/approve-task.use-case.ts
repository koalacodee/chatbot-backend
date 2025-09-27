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
    if (!task) throw new NotFoundException({ id: 'task_not_found' });

    // Find the task submission
    const taskSubmission = await this.taskSubmissionRepo.findByTaskId(
      dto.taskId,
    );
    if (!taskSubmission) {
      throw new NotFoundException('No submission found for this task');
    }

    // Approve the task submission
    const approvedSubmission = await this.approveTaskSubmissionUseCase.execute(
      { taskSubmissionId: taskSubmission.id.toString() },
      userId,
    );

    return approvedSubmission.task;
  }
}
