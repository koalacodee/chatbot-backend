import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

interface GetDepartmentLevelTasksInput {
  departmentId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetDepartmentLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(
    input: GetDepartmentLevelTasksInput,
  ): Promise<{ tasks: Task[]; attachments: { [taskId: string]: string[] } }> {
    const { departmentId } = input;

    // Use repository's optimized query for department-level tasks
    const tasks = await this.taskRepo.findDepartmentLevelTasks(departmentId);

    // Get attachments for all tasks
    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: tasks.map((task) => task.id.toString()),
    });

    return { tasks, attachments };
  }
}
