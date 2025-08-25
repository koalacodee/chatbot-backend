import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task } from '../../domain/entities/task.entity';

export interface GetTeamTasksInput {
  employeeId?: string;
  subDepartmentId?: string;
  departmentId?: string;
  includeSubDepartmentTasks?: boolean;
  includeDepartmentTasks?: boolean;
  status?: string[];
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetTeamTasksUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: GetTeamTasksInput): Promise<Task[]> {
    const {
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    } = input;

    // Use the new repository method for efficient database-level filtering
    return this.taskRepository.findTeamTasks({
      employeeId,
      subDepartmentId,
      departmentId,
      status,
      offset,
      limit,
    });
  }
}
