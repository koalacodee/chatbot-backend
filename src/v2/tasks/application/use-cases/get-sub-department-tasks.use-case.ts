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
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';

@Injectable()
export class GetSubDepartmentTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly submissionRepo: TaskSubmissionRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    userId: string,
    subDepartmentId?: string,
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
    if (userRole !== Roles.ADMIN && subDepartmentId) {
      const { hasAccess } =
        await this.departmentRepo.supervisorHasAccessToDepartment(
          { supervisorUserId: userId },
          subDepartmentId,
        );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have access to this sub-department',
        );
      }
    }

    const [{ data: tasks, meta }, metrics] = await Promise.all([
      this.taskRepo.findSubDepartmentLevelTasks(subDepartmentId, filters),
      this.taskRepo.getTaskMetricsForSubDepartment(subDepartmentId, filters),
    ]);

    const taskIds = tasks.map((t) => t.id);
    const submissions = await this.submissionRepo.findByTaskIds(taskIds);
    const submissionIds = submissions.map((s) => s.id);

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: [...taskIds, ...submissionIds],
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      meta,
      data: {
        tasks,
        submissions,
        attachments,
        metrics,
      },
    };
  }
}
