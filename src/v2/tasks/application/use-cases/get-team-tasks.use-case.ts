import { Injectable, ForbiddenException } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import { Task, TaskStatus } from '../../domain/entities/task.entity';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';

@Injectable()
export class GetTeamTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(input: {
    userId: string;
    employeeId?: string;
    subDepartmentId?: string;
    departmentId?: string;
    status?: TaskStatus[];
    cursor?: CursorInput;
  }): Promise<
    PaginatedObjectResult<{
      tasks: ReturnType<typeof Task.prototype.toJSON>[];
      submissions: ReturnType<typeof TaskSubmission.prototype.toJSON>[];
      delegationSubmissions: ReturnType<
        typeof TaskDelegationSubmission.prototype.toJSON
      >[];
      attachments: FilehubAttachmentMessage[];
    }>
  > {
    const user = await this.userRepo.findById(input.userId);
    const userRole = user.role.getRole();

    // Validate access to requested department/sub-department
    if (userRole !== Roles.ADMIN) {
      if (input.departmentId) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: input.userId },
            input.departmentId,
          );
        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this department',
          );
        }
      }
      if (input.subDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: input.userId },
            input.subDepartmentId,
          );
        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this sub-department',
          );
        }
      }
    }

    const { data: tasks, meta } = await this.taskRepo.findTeamTasks({
      employeeId: input.employeeId,
      subDepartmentId: input.subDepartmentId,
      departmentId: input.departmentId,
      status: input.status,
      cursor: input.cursor,
    });

    const taskIds = tasks.map((t) => t.id);

    const [submissions, delegationSubmissions] = await Promise.all([
      this.taskSubmissionRepo.findByTaskIds(taskIds),
      this.taskDelegationSubmissionRepo.findByTaskIds(taskIds, true),
    ]);

    const allTargetIds = [
      ...taskIds,
      ...submissions.map((s) => s.id),
      ...delegationSubmissions.map((s) => s.id),
    ];

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: allTargetIds,
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      meta,
      data: {
        tasks: tasks.map((t) => t.toJSON()),
        submissions: submissions.map((s) => s.toJSON()),
        delegationSubmissions: delegationSubmissions.map((s) => s.toJSON()),
        attachments,
      },
    };
  }
}
