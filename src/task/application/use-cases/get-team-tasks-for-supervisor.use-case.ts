import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { Task, TaskPriority, TaskStatus } from '../../domain/entities/task.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Attachment } from 'src/filehub/domain/entities/attachment.entity';
import { CursorMeta, PaginatedResult } from 'src/common/drizzle/helpers/cursor';

export interface GetTeamTasksForSupervisorInput {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  cursor?: string;
  cursorDir?: 'next' | 'prev';
  limit?: number;
}

@Injectable()
export class GetTeamTasksForSupervisorUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) { }

  async execute(
    input: GetTeamTasksForSupervisorInput,
    userId: string,
  ): Promise<PaginatedResult<{
    task: Task;
    rejectionReason?: string;
    approvalFeedback?: string;
  }> & {
    fileHubAttachments: Attachment[];
    metrics: {
      pendingTasks: number;
      completedTasks: number;
      taskCompletionPercentage: number;
    };
  }> {
    const { status, priority, cursor, cursorDir, limit } = input;

    const supervisor = await this.supervisorRepository.findByUserId(userId);
    if (!supervisor) {
      throw new Error('Supervisor not found');
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());

    const result = await this.taskRepository.getTeamTasksForSupervisor({
      supervisorDepartmentIds,
      status,
      priority,
      cursor: cursor ? { cursor, direction: cursorDir ?? 'next', pageSize: limit } : undefined,
    });

    return result;
  }
}
