import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';

@Injectable()
export class RestartTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) { }

  async execute(taskId: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    await this.taskRepository.restart(taskId);
  }
}
