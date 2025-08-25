import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface GetTasksWithFiltersInputDto {
  assigneeId?: string;
  departmentId?: string;
  status?: string; // TaskStatus as string
  offset?: number;
  limit?: number;
}

@Injectable()
export class GetTasksWithFiltersUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(dto: GetTasksWithFiltersInputDto): Promise<Task[]> {
    const { assigneeId, departmentId, status, offset, limit } = dto;

    // Choose the most selective repository method available, then filter in-memory for the rest.
    let base: Task[];
    if (assigneeId && !departmentId) {
      base = await this.taskRepo.findByAssignee(assigneeId);
    } else if (departmentId && !assigneeId) {
      base = await this.taskRepo.findByDepartment(departmentId);
    } else {
      base = await this.taskRepo.findAll();
    }

    let filtered = base;
    if (assigneeId) {
      filtered = filtered.filter(
        (t) => t.assignee.id.toString() === assigneeId,
      );
    }
    if (departmentId) {
      filtered = filtered.filter(
        (t) => t.targetDepartment.id.toString() === departmentId,
      );
    }
    if (status) {
      filtered = filtered.filter((t) => (t.status as any) === status);
    }

    // Apply pagination after filtering
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    return filtered.slice(start, end);
  }
}
