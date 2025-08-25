import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface GetDepartmentLevelTasksInput {
  departmentId?: string;
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetDepartmentLevelTasksUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(input: GetDepartmentLevelTasksInput): Promise<Task[]> {
    const { departmentId } = input;

    // Use repository's optimized query for department-level tasks
    return this.taskRepo.findDepartmentLevelTasks(departmentId);
  }
}
