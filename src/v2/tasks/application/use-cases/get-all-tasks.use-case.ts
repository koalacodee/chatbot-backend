import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import { Task } from '../../domain/entities/task.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';

@Injectable()
export class GetAllTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    filters?: {
      cursor?: CursorInput;
      start?: Date;
      end?: Date;
    },
  ): Promise<
    PaginatedObjectResult<{
      tasks: Task[];
      attachments: FilehubAttachmentMessage[];
      submissions: TaskSubmission[];
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

    const { meta, data } = await this.taskRepo.findAll({
      ...filters,
      departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
    });

    const [attachments, submissions] = await Promise.all([
      this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: data.map((task) => task.id),
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      }),
      this.taskSubmissionRepo.findByTaskIds(data.map((task) => task.id)),
    ]);

    return {
      meta,
      data: {
        tasks: data,
        attachments,
        submissions,
      },
    };
  }
}
