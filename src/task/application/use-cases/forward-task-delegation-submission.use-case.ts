import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface ForwardTaskDelegationSubmissionInputDto {
  submissionId: string;
  delegatorUserId: string; // userId of the delegator
}

@Injectable()
export class ForwardTaskDelegationSubmissionUseCase {
  constructor(
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async execute(
    dto: ForwardTaskDelegationSubmissionInputDto,
  ): Promise<TaskDelegationSubmission> {
    const submission = await this.taskDelegationSubmissionRepository.findById(
      dto.submissionId,
    );

    if (!submission) {
      throw new NotFoundException({
        details: [
          {
            field: 'submissionId',
            message: 'Task delegation submission not found',
          },
        ],
      });
    }

    if (submission.forwarded) {
      throw new BadRequestException({
        details: [
          {
            field: 'submissionId',
            message: 'Task delegation submission has already been forwarded',
          },
        ],
      });
    }

    const delegation = submission.delegation;

    const user = await this.userRepository.findById(dto.delegatorUserId);

    if (!user) {
      throw new NotFoundException({
        details: [
          { field: 'delegatorUserId', message: 'User not found' },
        ],
      });
    }

    if (user.role.getRole() !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'delegatorUserId',
            message: 'Only supervisors can forward delegation submissions',
          },
        ],
      });
    }

    const supervisor = await this.supervisorRepository.findByUserId(
      dto.delegatorUserId,
    );

    if (!supervisor) {
      throw new NotFoundException({
        details: [
          {
            field: 'delegatorUserId',
            message: 'Supervisor profile not found for user',
          },
        ],
      });
    }

    if (supervisor.id.toString() !== delegation.delegatorId) {
      throw new ForbiddenException({
        details: [
          {
            field: 'delegatorUserId',
            message:
              'Only the delegator who created this delegation can forward submissions',
          },
        ],
      });
    }

    submission.forwarded = true;

    return this.taskDelegationSubmissionRepository.save(submission);
  }
}

