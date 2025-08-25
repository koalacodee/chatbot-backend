import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';

@Injectable()
export class CountTasksUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(): Promise<number> {
    return this.taskRepo.count();
  }
}
