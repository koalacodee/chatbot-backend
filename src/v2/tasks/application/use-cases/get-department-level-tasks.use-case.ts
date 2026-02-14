import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  TaskRepository,
  DepartmentTaskFilters,
} from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { PaginatedObjectResult } from '@/common/drizzle/helpers/cursor';
import { Task } from '../../domain/entities/task.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';

@Injectable()
export class GetDepartmentLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    userId: string,
    departmentId?: string,
    filters?: DepartmentTaskFilters,
  ): Promise<
    PaginatedObjectResult<{
      tasks: Task[];
      submissions: TaskSubmission[];
      attachments: FilehubAttachmentMessage[];
      metrics: {
        pendingCount: number;
        completedCount: number;
        completionPercentage: number;
      };
    }>
  > {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    // Validate access
    if (userRole !== Roles.ADMIN && departmentId) {
      const { hasAccess } =
        await this.departmentRepo.supervisorHasAccessToDepartment(
          { supervisorUserId: userId },
          departmentId,
        );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have access to this department',
        );
      }
    }

    const [{ data: tasks, meta }, metrics] = await Promise.all([
      this.taskRepo.findDepartmentLevelTasks(departmentId, filters),
      this.taskRepo.getTaskMetricsForDepartment(departmentId, filters),
    ]);

    const submissions = tasks.flatMap((t) => t.submissions);
    const targetIds = [
      ...tasks.map((t) => t.task.id),
      ...submissions.map((s) => s.id),
    ];

    const [attachments] = await Promise.all([
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds,
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      }),
    ]);

    return {
      meta,
      data: {
        tasks: tasks.map((t) => t.task),
        submissions,
        attachments,
        metrics,
      },
    };
  }
}
