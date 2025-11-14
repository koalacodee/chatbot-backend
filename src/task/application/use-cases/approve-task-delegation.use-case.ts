import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import {
  TaskDelegationSubmission as TaskDelegationSubmission,

} from '../../domain/entities/task-delegation-submission.entity';
import { TaskStatus } from '../../domain/entities/task.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { TaskSubmissionStatus } from 'src/task/domain/entities/task-submission.entity';

interface ApproveTaskDelegationInputDto {
  submissionId: string;
  reviewerId: string; // userId of the reviewer
  feedback?: string;
}

@Injectable()
export class ApproveTaskDelegationUseCase {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async execute(dto: ApproveTaskDelegationInputDto): Promise<{
    delegation: TaskDelegation;
    submission: TaskDelegationSubmission;
  }> {
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

    const reviewer = await this.resolveReviewer(dto.reviewerId, delegation);

    submission.approve(reviewer, dto.feedback);

    delegation.status = TaskStatus.COMPLETED;
    delegation.completedAt = new Date();
    delegation.updatedAt = new Date();

    const [savedSubmission, savedDelegation] = await Promise.all([
      this.taskDelegationSubmissionRepository.save(submission),
      this.taskDelegationRepository.save(delegation),
    ]);

    return {
      delegation: savedDelegation,
      submission: savedSubmission,
    };
  }

  private async resolveReviewer(
    reviewerUserId: string,
    delegation: TaskDelegation,
  ): Promise<Admin | Supervisor> {
    const user = await this.userRepository.findById(reviewerUserId);

    if (!user) {
      throw new NotFoundException({
        details: [
          { field: 'reviewerId', message: 'Reviewer user not found' },
        ],
      });
    }

    const role = user.role.getRole();

    if (role === Roles.ADMIN) {
      const admin = await this.adminRepository.findByUserId(reviewerUserId);
      if (!admin) {
        throw new NotFoundException({
          details: [
            { field: 'reviewerId', message: 'Admin profile not found for user' },
          ],
        });
      }
      return admin;
    }

    if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(
        reviewerUserId,
      );
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
                'You do not have permission to approve this delegation submission',
            },
          ],
        });
      }

      return supervisor;
    }

    throw new ForbiddenException({
      details: [
        {
          field: 'reviewerId',
          message: 'Only administrators or delegating supervisors can approve',
        },
      ],
    });
  }
}
