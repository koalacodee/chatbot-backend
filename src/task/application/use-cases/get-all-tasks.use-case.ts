import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';

@Injectable()
export class GetAllTasksUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(offset?: number, limit?: number): Promise<Task[]> {
    return this.taskRepo.findAll(offset, limit);
  }
}
