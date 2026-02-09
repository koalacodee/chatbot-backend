import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskStatus } from '../../domain/entities/task.entity';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { TaskSubmissionStatus } from '../../domain/entities/task-submission.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationApprovedEvent } from '../../domain/events/task-delegation-approved.event';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';

interface ApproveTaskDelegationInputDto {
  submissionId: string;
  reviewerId: string; // userId of the reviewer
  feedback?: string;
}

@Injectable()
export class ApproveTaskDelegationUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly adminRepo: AdminRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly userRepo: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ApproveTaskDelegationInputDto): Promise<{
    delegation: TaskDelegation;
    submission: TaskDelegationSubmission;
  }> {
    const submission = await this.taskDelegationSubmissionRepo.findById(
      dto.submissionId,
    );

    if (!submission) {
      throw new NotFoundException({
        id: 'delegation_submission_not_found',
        message: 'Task delegation submission not found',
      });
    }

    if (submission.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException({
        id: 'delegation_already_reviewed',
        message: 'Task delegation submission has already been reviewed',
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

    const reviewer = await this.resolveReviewer(dto.reviewerId, delegation);

    submission.approve(reviewer, dto.feedback);

    delegation.status = TaskStatus.COMPLETED;
    delegation.completedAt = new Date();
    delegation.updatedAt = new Date();

    const [savedSubmission, savedDelegation] = await Promise.all([
      this.taskDelegationSubmissionRepo.save(submission),
      this.taskDelegationRepo.save(delegation),
    ]);

    this.eventEmitter.emit(
      TaskDelegationApprovedEvent.name,
      new TaskDelegationApprovedEvent(
        delegation.id,
        submission.id,
        dto.reviewerId,
        dto.feedback,
      ),
    );

    return {
      delegation: savedDelegation,
      submission: savedSubmission,
    };
  }

  private async resolveReviewer(
    reviewerUserId: string,
    delegation: TaskDelegation,
  ): Promise<Admin | Supervisor> {
    const user = await this.userRepo.findById(reviewerUserId);

    if (!user) {
      throw new NotFoundException({
        id: 'reviewer_not_found',
        message: 'Reviewer user not found',
      });
    }

    const role = user.role.getRole();

    if (role === Roles.ADMIN) {
      const admin = await this.adminRepo.findByUserId(reviewerUserId);
      if (!admin) {
        throw new NotFoundException({
          id: 'admin_profile_not_found',
          message: 'Admin profile not found for user',
        });
      }
      return admin;
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepo.findByUserId(reviewerUserId);
      if (!supervisor) {
        throw new NotFoundException({
          id: 'supervisor_profile_not_found',
          message: 'Supervisor profile not found for user',
        });
      }

      // Check if this supervisor is the one who delegated the task
      if (supervisor.id.toString() !== delegation.delegatorId) {
        throw new ForbiddenException({
          id: 'delegation_approve_forbidden',
          message:
            'You do not have permission to approve this delegation submission',
        });
      }

      return supervisor;
    }

    throw new ForbiddenException({
      id: 'delegation_reviewer_invalid_role',
      message: 'Only administrators or delegating supervisors can approve',
    });
  }
}
