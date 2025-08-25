import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';

@Injectable()
export class DeleteTaskUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(id: string): Promise<Task | null> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });
    await this.taskRepo.removeById(id);
    return existing;
  }
}
