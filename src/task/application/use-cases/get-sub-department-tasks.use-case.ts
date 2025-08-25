import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface GetSubDepartmentTasksInput {
  subDepartmentId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetSubDepartmentTasksUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(input: GetSubDepartmentTasksInput): Promise<Task[]> {
    const { subDepartmentId } = input;

    // Use repository's optimized query for sub-department-level tasks
    return this.taskRepo.findSubDepartmentLevelTasks(subDepartmentId);
  }
}
