import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationSubmissionForwardedEvent } from '../../domain/events/task-delegation-submission-forwarded.event';
import { TaskDelegationSubmissionRepository as v2TaskDelegationSubmissionRepo } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission as v2TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import {
  TaskSubmission,
  TaskSubmissionStatus,
} from '../../domain/entities/task-submission.entity';

interface ForwardTaskDelegationSubmissionInputDto {
  submissionId: string;
  delegatorUserId: string;
  message?: string;
  targetSupervisorId?: string;
}

@Injectable()
export class ForwardTaskDelegationSubmissionUseCase {
  constructor(
    private readonly taskDelegationSubmissionRepo: v2TaskDelegationSubmissionRepo,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly userRepo: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: ForwardTaskDelegationSubmissionInputDto,
  ): Promise<v2TaskDelegationSubmission> {
    const submission = await this.taskDelegationSubmissionRepo.findById(
      dto.submissionId,
    );

    if (!submission) {
      throw new NotFoundException({
        id: 'delegation_submission_not_found',
        message: 'Task delegation submission not found',
      });
    }

    if (submission.forwarded) {
      throw new BadRequestException({
        id: 'delegation_already_forwarded',
        message: 'Task delegation submission has already been forwarded',
      });
    }

    const delegation = await this.taskDelegationRepo.findById(
      submission.delegationId,
    );
    if (!delegation) {
      throw new NotFoundException({
        id: 'delegation_not_found',
        message: 'Associated task delegation not found',
      });
    }

    const user = await this.userRepo.findById(dto.delegatorUserId);

    if (!user) {
      throw new NotFoundException({
        id: 'user_not_found',
        message: 'User not found',
      });
    }

    if (user.role.getRole() !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        id: 'forward_supervisor_only',
        message: 'Only supervisors can forward delegation submissions',
      });
    }

    const supervisor = await this.supervisorRepo.findByUserId(
      dto.delegatorUserId,
    );

    if (!supervisor) {
      throw new NotFoundException({
        id: 'supervisor_profile_not_found',
        message: 'Supervisor profile not found for user',
      });
    }

    if (supervisor.id.toString() !== delegation.delegatorId) {
      throw new ForbiddenException({
        id: 'forward_delegator_only',
        message:
          'Only the delegator who created this delegation can forward submissions',
      });
    }

    submission.forwarded = true;
    if (dto.message) submission.forwardedMessage = dto.message;
    if (dto.targetSupervisorId)
      submission.forwardedToSupervisorId = dto.targetSupervisorId;

    const taskSubmission = TaskSubmission.create({
      taskId: submission.taskId,
      delegationSubmissionId: submission.id,
      performerId: submission.performerId,
      performerType: submission.performerType,
      performerName: submission.performerName,
      notes: submission.notes,
      status: submission.status as TaskSubmissionStatus,
      submittedAt: submission.submittedAt,
    });
    await this.taskSubmissionRepo.save(taskSubmission);

    const savedSubmission =
      await this.taskDelegationSubmissionRepo.save(submission);

    this.eventEmitter.emit(
      TaskDelegationSubmissionForwardedEvent.name,
      new TaskDelegationSubmissionForwardedEvent(
        submission.id,
        dto.delegatorUserId,
      ),
    );

    return savedSubmission;
  }
}
