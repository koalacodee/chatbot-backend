import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';

interface MarkTaskSeenInputDto {
  taskId: string;
}

@Injectable()
export class MarkTaskSeenUseCase {
  constructor(private readonly taskRepo: TaskRepository) {}

  async execute(dto: MarkTaskSeenInputDto): Promise<Task> {
    const existing = await this.taskRepo.findById(dto.taskId);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    existing.status = 'SEEN' as any;
    return this.taskRepo.save(existing);
  }
}
