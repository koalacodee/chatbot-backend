import { Injectable } from '@nestjs/common';
import {
  TaskRepository,
  IndividualTaskFilters,
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
export class GetIndividualLevelTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    filters?: IndividualTaskFilters,
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

    let departmentIds: string[] = [];

    if (userRole === Roles.SUPERVISOR) {
      const departments = await this.departmentRepo.getSupervisorDepartments({
        supervisorIdOrUserId: { supervisorUserId: userId },
        fullDepartment: false,
      });
      departmentIds = departments.map((d) => d.id);
    } else if (userRole === Roles.EMPLOYEE) {
      const subDepartments =
        await this.departmentRepo.getEmployeeSubDepartments(
          { employeeUserId: userId },
          false,
        );
      departmentIds = subDepartments.map((d) => d.id);
    }

    const [{ data: tasks, meta }, metrics] = await Promise.all([
      this.taskRepo.findSubIndividualsLevelTasks({
        ...filters,
        departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
      }),
      this.taskRepo.getTaskMetricsForIndividual({
        ...filters,
        departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
      }),
    ]);

    const [attachments, submissions] = await Promise.all([
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: tasks.map((t) => t.id),
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      }),
      this.taskSubmissionRepo.findByTaskIds(tasks.map((t) => t.id)),
    ]);

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
