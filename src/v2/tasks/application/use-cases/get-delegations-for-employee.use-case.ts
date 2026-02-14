import { Injectable } from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetDelegationsForEmployeeUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
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
      attachments: FilehubAttachmentMessage[];
    }>
  > {
    const employeeSubDepartments =
      await this.departmentRepository.getEmployeeSubDepartments(
        { employeeUserId: userId },
        false,
      );
    const { data: delegations, meta } =
      await this.taskDelegationRepo.findMyDelegationsForEmployee({
        assignee: {
          assigneeUserId: userId,
          assigneeId: undefined as never,
        },
        subDepartmentIds: employeeSubDepartments.map(({ id }) => id),
        ...filters,
      });

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: delegations.map((d) => d.id),
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      meta,
      data: {
        delegations,
        attachments,
      },
    };
  }
}
