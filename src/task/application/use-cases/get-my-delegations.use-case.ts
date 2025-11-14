import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

interface GetMyDelegationsInputDto {
  userId: string;
  offset?: number;
  limit?: number;
  status?: string;
}

interface GetMyDelegationsResult {
  delegations: TaskDelegation[];
  submissions: { [delegationId: string]: TaskDelegationSubmission[] };
  attachments: { [delegationId: string]: string[] };
  delegationSubmissionAttachments: { [delegationSubmissionId: string]: string[] };
  total: number;
}

@Injectable()
export class GetMyDelegationsUseCase {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) { }

  async execute(
    dto: GetMyDelegationsInputDto,
  ): Promise<GetMyDelegationsResult> {
    const user = await this.userRepository.findById(dto.userId);

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    if (user.role.getRole() !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'role',
            message: 'Only supervisors can view their delegations',
          },
        ],
      });
    }

    const supervisor = await this.supervisorRepository.findByUserId(
      dto.userId,
    );

    if (!supervisor) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'Supervisor not found' }],
      });
    }

    // Get delegations with database-level filtering and pagination
    const { delegations: paginatedDelegations, total } =
      await this.taskDelegationRepository.findByDelegatorIdWithFilters({
        delegatorId: supervisor.id.toString(),
        status: dto.status,
        offset: dto.offset,
        limit: dto.limit,
      });

    // Get delegation IDs for fetching submissions
    const delegationIds = paginatedDelegations.map((d) => d.id.toString());

    // Get all submissions for these delegations
    const allSubmissions =
      delegationIds.length > 0
        ? await this.taskDelegationSubmissionRepository.findByDelegationIds(
          delegationIds,
        )
        : [];

    // Group submissions by delegation ID
    const submissionsByDelegation: {
      [delegationId: string]: TaskDelegationSubmission[];
    } = {};
    paginatedDelegations.forEach((delegation) => {
      submissionsByDelegation[delegation.id.toString()] = [];
    });
    allSubmissions.forEach((submission) => {
      const delegationId = submission.delegationId.toString();
      if (submissionsByDelegation[delegationId]) {
        submissionsByDelegation[delegationId].push(submission);
      }
    });

    // Get task IDs from delegations for attachments
    const delegationTaskIds = paginatedDelegations.map((d) => d.taskId);

    // Get attachments for delegation tasks
    const taskAttachments =
      delegationTaskIds.length > 0
        ? await this.getAttachmentsUseCase.execute({
          targetIds: delegationTaskIds,
        })
        : {};

    const delegationSubmissionAttachments = await this.getAttachmentsUseCase.execute({
      targetIds: allSubmissions.map((s) => s.id.toString()),
    });

    // Map delegation attachments: use task attachments for each delegation
    const delegationAttachments: { [delegationId: string]: string[] } = {};
    paginatedDelegations.forEach((delegation) => {
      delegationAttachments[delegation.id.toString()] =
        taskAttachments[delegation.taskId] || [];
    });

    return {
      delegations: paginatedDelegations,
      submissions: submissionsByDelegation,
      attachments: delegationAttachments,
      delegationSubmissionAttachments,
      total,
    };
  }
}

