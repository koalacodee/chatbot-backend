import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Task } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

interface ApproveTaskInputDto {
  taskId: string;
  approverId: string;
}

@Injectable()
export class ApproveTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(dto: ApproveTaskInputDto): Promise<Task> {
    if (!dto.approverId) throw new BadRequestException({ approverId: 'required' });

    const [task, approver] = await Promise.all([
      this.taskRepo.findById(dto.taskId),
      this.userRepo.findById(dto.approverId),
    ]);

    if (!task) throw new NotFoundException({ id: 'task_not_found' });
    if (!approver) throw new NotFoundException({ approverId: 'not_found' });

    task.approver = approver as any;
    task.status = 'COMPLETED' as any;
    task.completedAt = new Date();

    return this.taskRepo.save(task);
  }
}
