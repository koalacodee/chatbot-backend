import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface GetIndividualLevelTasksInput {
  assigneeId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetIndividualLevelTasksUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(input: GetIndividualLevelTasksInput): Promise<Task[]> {
    return this.taskRepo.findSubIndividualsLevelTasks(input.assigneeId);
  }
}
