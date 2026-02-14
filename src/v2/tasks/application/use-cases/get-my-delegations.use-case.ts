import { Injectable } from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  CursorInput,
  PaginatedArrayResult,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';

@Injectable()
export class GetMyDelegationsUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
  ) {}

  async execute(
    userId: string,
    filters?: {
      cursor?: CursorInput;
      status?: string[];
    },
  ): Promise<
    PaginatedObjectResult<{
      delegations: TaskDelegation[];
      submissions: TaskDelegationSubmission[];
      attachments: FilehubAttachmentMessage[];
    }>
  > {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    let delegationsResult: PaginatedArrayResult<TaskDelegation>;

    if (userRole === Roles.SUPERVISOR) {
      delegationsResult =
        await this.taskDelegationRepo.findMyDelegationsForSupervisor({
          delegator: {
            delegatorUserId: userId,
            delegatorId: undefined as never,
          },
          ...filters,
        });
    } else {
      const employeeSubDepartments =
        await this.departmentRepo.getEmployeeSubDepartments(
          {
            employeeUserId: userId,
          },
          false,
        );
      // Employees see delegations assigned to them
      delegationsResult =
        await this.taskDelegationRepo.findMyDelegationsForEmployee({
          assignee: { assigneeUserId: userId, assigneeId: undefined as never },
          subDepartmentIds: employeeSubDepartments.map(
            (subDepartment) => subDepartment.id,
          ),
          ...filters,
        });
    }

    const { data: delegations, meta } = delegationsResult;

    const submissions =
      await this.taskDelegationSubmissionRepo.findByDelegationIds(
        delegations.map((d) => d.id),
      );

    const taskIds = [...new Set(delegations.map((d) => d.taskId))];
    const tasksWithSubmissions =
      await this.taskRepo.findByIdsWithSubmissions(taskIds);
    const taskMap = new Map(
      tasksWithSubmissions.map((t) => [t.task.id, t]),
    );
    for (const delegation of delegations) {
      const entry = taskMap.get(delegation.taskId);
      if (entry) {
        delegation.task = entry.task;
      }
    }

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: [
          ...delegations.map((d) => d.id),
          ...submissions.map((s) => s.id),
        ],
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      meta,
      data: {
        delegations,
        submissions,
        attachments,
      },
    };
  }
}
