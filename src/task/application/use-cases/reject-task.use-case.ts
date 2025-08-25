import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface RejectTaskInputDto {
  taskId: string;
  feedback?: string;
}

@Injectable()
export class RejectTaskUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(dto: RejectTaskInputDto): Promise<Task> {
    const existing = await this.taskRepo.findById(dto.taskId);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    existing.status = 'TODO' as any;
    existing.completedAt = null;
    if (dto.feedback !== undefined) existing.feedback = dto.feedback as any;

    return this.taskRepo.save(existing);
  }
}
