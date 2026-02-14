import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../domain/entities/task.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetTasksWithFiltersUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    userId: string,
    filters?: {
      status?: TaskStatus[];
      priority?: TaskPriority[];
      search?: string;
      cursor?: CursorInput;
      start?: Date;
      end?: Date;
      assigneeId?: string;
      departmentId?: string;
    },
  ): Promise<
    PaginatedObjectResult<{
      tasks: Task[];
      attachments: FilehubAttachmentMessage[];
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

    const { data: tasks, meta } = await this.taskRepo.findAll({
      ...filters,
      departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
    });

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: tasks.map((t) => t.id),
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      meta,
      data: {
        tasks,
        attachments,
      },
    };
  }
}
