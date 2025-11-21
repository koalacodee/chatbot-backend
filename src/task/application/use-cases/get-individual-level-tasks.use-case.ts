import { Injectable } from '@nestjs/common';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

interface GetIndividualLevelTasksInput {
  assigneeId?: string;
  departmentId?: string;
  offset?: number;
  limit?: number;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  search?: string;
}

interface IndividualLevelTasksResult {
  tasks: Task[];
  submissions: TaskSubmission[];
  attachments: { [taskId: string]: string[] };
  metrics: {
    pendingCount: number;
    completedCount: number;
    completionPercentage: number;
  };
}

@Injectable()
export class GetIndividualLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
    private readonly departmentRepository: DepartmentRepository,
  ) { }

  async execute(
    input: GetIndividualLevelTasksInput,
  ): Promise<IndividualLevelTasksResult> {
    const {
      assigneeId,
      departmentId,
      status,
      priority,
      search,
    } = input;

    const normalizedSearch = search?.trim() || undefined;

    let departmentIds: string[] | undefined;
    if (departmentId) {
      departmentIds = await this.getDepartmentWithChildren(departmentId);
      if (!departmentIds.length) {
        departmentIds = undefined;
      }
    }

    const filters = {
      assigneeId,
      departmentIds,
      status: status?.length ? status : undefined,
      priority: priority?.length ? priority : undefined,
      search: normalizedSearch,
    };

    const tasks = await this.taskRepo.findSubIndividualsLevelTasks(filters);

    // Get attachments and submissions for all tasks
    const [attachments, submissions] = await Promise.all([
      this.getAttachmentsUseCase.execute({
        targetIds: tasks.map((task) => task.id.toString()),
      }),
      this.taskSubmissionRepo.findByTaskIds(
        tasks.map((task) => task.id.toString()),
      ),
    ]);

    // Get metrics for individual-level tasks
    const metrics = await this.taskRepo.getTaskMetricsForIndividual(filters);

    return { tasks, submissions, attachments, metrics };
  }

  private async getDepartmentWithChildren(
    departmentId: string,
  ): Promise<string[]> {
    const queue: string[] = [departmentId];
    const visited = new Set<string>();

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const children =
        await this.departmentRepository.findSubDepartmentByParentId(current);
      for (const child of children) {
        const childId = child.id.toString();
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    return Array.from(visited);
  }
}
