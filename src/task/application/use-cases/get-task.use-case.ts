import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';

@Injectable()
export class GetTaskUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(id: string): Promise<Task> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundException({ id: 'task_not_found' });
    return task;
  }
}
