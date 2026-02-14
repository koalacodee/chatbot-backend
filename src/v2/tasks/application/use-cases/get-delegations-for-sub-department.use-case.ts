import { Injectable } from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import {
  CursorInput,
  PaginatedObjectResult,
} from '@/common/drizzle/helpers/cursor';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';

@Injectable()
export class GetDelegationsForSubDepartmentUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    subDepartmentId: string,
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
    const { data: delegations, meta } =
      await this.taskDelegationRepo.findBySubDepartment(
        subDepartmentId,
        filters,
      );

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
