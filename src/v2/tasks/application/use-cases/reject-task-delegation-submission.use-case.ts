import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskStatus } from '../../domain/entities/task.entity';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { Admin } from '@/admin/domain/entities/admin.entity';
import { Supervisor } from '@/supervisor/domain/entities/supervisor.entity';
import { TaskSubmissionStatus } from '@/task/domain/entities/task-submission.entity';
import { TaskDelegationRejectedEvent } from '../../domain/events/task-delegation-rejected.event';

interface RejectTaskDelegationSubmissionInputDto {
  submissionId: string;
  reviewerId: string;
  feedback?: string;
}

@Injectable()
export class RejectTaskDelegationSubmissionUseCase {
  constructor(
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: RejectTaskDelegationSubmissionInputDto): Promise<{
    delegation: ReturnType<typeof TaskDelegation.prototype.toJSON>;
    submission: ReturnType<typeof TaskDelegationSubmission.prototype.toJSON>;
  }> {
    const submission = await this.taskDelegationSubmissionRepo.findById(
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

    if (submission.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException({
        details: [
          {
            field: 'submissionId',
            message: 'Task delegation submission has already been reviewed',
          },
        ],
      });
    }

    const delegation = submission.delegation;

    const { reviewer, reviewerType } = await this.resolveReviewer(
      dto.reviewerId,
      delegation,
    );

    submission.reject(reviewer, dto.feedback);

    delegation.status = TaskStatus.TODO;
    delegation.completedAt = undefined;
    delegation.updatedAt = new Date();

    const [savedSubmission, savedDelegation] = await Promise.all([
      this.taskDelegationSubmissionRepo.save(submission),
      this.taskDelegationRepo.save(delegation),
    ]);

    // Emit domain event
    await this.eventEmitter.emitAsync(
      TaskDelegationRejectedEvent.name,
      new TaskDelegationRejectedEvent(
        savedDelegation.id.toString(),
        savedSubmission.id.toString(),
        dto.reviewerId,
        reviewerType,
        dto.feedback,
      ),
    );

    return {
      delegation: savedDelegation.toJSON(),
      submission: savedSubmission.toJSON(),
    };
  }

  private async resolveReviewer(
    reviewerUserId: string,
    delegation: TaskDelegation,
  ): Promise<{
    reviewer: Admin | Supervisor;
    reviewerType: 'ADMIN' | 'SUPERVISOR';
  }> {
    const user = await this.userRepository.findById(reviewerUserId);

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'reviewerId', message: 'Reviewer user not found' }],
      });
    }

    const role = user.role.getRole();

    if (role === Roles.ADMIN) {
      const admin = await this.adminRepository.findByUserId(reviewerUserId);
      if (!admin) {
        throw new NotFoundException({
          details: [
            {
              field: 'reviewerId',
              message: 'Admin profile not found for user',
            },
          ],
        });
      }
      return { reviewer: admin, reviewerType: 'ADMIN' };
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor =
        await this.supervisorRepository.findByUserId(reviewerUserId);
      if (!supervisor) {
        throw new NotFoundException({
          details: [
            {
              field: 'reviewerId',
              message: 'Supervisor profile not found for user',
            },
          ],
        });
      }

      if (supervisor.id.toString() !== delegation.delegatorId) {
        throw new ForbiddenException({
          details: [
            {
              field: 'reviewerId',
              message:
                'You do not have permission to reject this delegation submission',
            },
          ],
        });
      }

      return { reviewer: supervisor, reviewerType: 'SUPERVISOR' };
    }

    throw new ForbiddenException({
      details: [
        {
          field: 'reviewerId',
          message: 'Only administrators or delegating supervisors can reject',
        },
      ],
    });
  }
}
