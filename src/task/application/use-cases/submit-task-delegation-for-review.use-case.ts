import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TaskDelegation } from '../../domain/entities/task-delegation.entity';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskDelegationSubmission as TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';
import { TaskStatus } from '../../domain/entities/task.entity';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { TaskSubmissionStatus } from 'src/task/domain/entities/task-submission.entity';
import { FilesService } from 'src/files/domain/services/files.service';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases';

interface SubmitTaskDelegationForReviewInputDto {
  delegationId: string;
  submittedBy: string; // userId of the submitter
  notes?: string;
  attach?: boolean;
  chooseAttachments?: string[];
}

@Injectable()
export class SubmitTaskDelegationForReviewUseCase {
  constructor(
    private readonly taskDelegationRepository: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepository: TaskDelegationSubmissionRepository,
    private readonly userRepository: UserRepository,
    private readonly adminRepository: AdminRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly filesService: FilesService,
    private readonly fileHubService: FileHubService,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
  ) { }

  async execute(dto: SubmitTaskDelegationForReviewInputDto): Promise<{
    delegation: TaskDelegation;
    submission: TaskDelegationSubmission;
    uploadKey?: string;
    fileHubUploadKey?: string;
    chooseAttachments?: string[];
  }> {
    const delegation = await this.taskDelegationRepository.findById(
      dto.delegationId,
    );

    if (!delegation) {
      throw new NotFoundException({
        details: [
          { field: 'delegationId', message: 'Task delegation not found' },
        ],
      });
    }

    if (delegation.status === TaskStatus.COMPLETED) {
      throw new BadRequestException({
        details: [
          {
            field: 'delegationId',
            message: 'Task delegation has already been completed',
          },
        ],
      });
    }

    const user = await this.userRepository.findById(dto.submittedBy);

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'submittedBy', message: 'User not found' }],
      });
    }

    const performer = await this.resolvePerformer(
      user.role.getRole(),
      dto.submittedBy,
    );

    const submission = TaskDelegationSubmission.create({
      delegationId: delegation.id.toString(),
      delegation: delegation,
      taskId: delegation.taskId,
      task: delegation.task,
      performerId: performer.performerId,
      performerType: performer.performerType,
      performer: performer.performer,
      performerName: performer.performerName,
      notes: dto.notes,
      status: TaskSubmissionStatus.SUBMITTED,
    });

    const savedSubmission =
      await this.taskDelegationSubmissionRepository.save(submission);

    const savedDelegation =
      await this.taskDelegationRepository.update(delegation.id.toString(), {
        status: TaskStatus.PENDING_REVIEW,
        updatedAt: new Date(),
      });

    const uploadKey = dto.attach
      ? await this.filesService.genUploadKey(
        savedSubmission.id.toString(),
        dto.submittedBy,
      )
      : undefined;

    const fileHubUploadKey = dto.attach
      ? await this.fileHubService
        .generateUploadToken({
          expiresInMs: 1000 * 60 * 60 * 24,
          targetId: savedSubmission.id.toString(),
          userId: dto.submittedBy,
        })
        .then((upload) => upload.uploadKey)
      : undefined;

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: savedSubmission.id.toString(),
      });
    }

    return {
      delegation: savedDelegation,
      submission: savedSubmission,
      uploadKey,
      fileHubUploadKey,
    };
  }

  private async resolvePerformer(
    role: Roles,
    userId: string,
  ): Promise<{
    performerId: string;
    performerType: 'admin' | 'supervisor' | 'employee';
    performer?: Admin | Supervisor | Employee;
    performerName?: string;
  }> {
    switch (role) {
      case Roles.ADMIN: {
        const admin = await this.adminRepository.findByUserId(userId);
        if (!admin) {
          throw new NotFoundException({
            details: [
              {
                field: 'submittedBy',
                message: 'Admin profile not found for user',
              },
            ],
          });
        }
        return {
          performerId: admin.id.toString(),
          performerType: 'admin',
          performer: admin,
          performerName: admin.user?.name,
        };
      }
      case Roles.SUPERVISOR: {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        if (!supervisor) {
          throw new NotFoundException({
            details: [
              {
                field: 'submittedBy',
                message: 'Supervisor profile not found for user',
              },
            ],
          });
        }
        return {
          performerId: supervisor.id.toString(),
          performerType: 'supervisor',
          performer: supervisor,
          performerName: supervisor.user?.name,
        };
      }
      case Roles.EMPLOYEE: {
        const employee = await this.employeeRepository.findByUserId(userId);
        if (!employee) {
          throw new NotFoundException({
            details: [
              {
                field: 'submittedBy',
                message: 'Employee profile not found for user',
              },
            ],
          });
        }
        return {
          performerId: employee.id.toString(),
          performerType: 'employee',
          performer: employee,
          performerName: employee.user?.name,
        };
      }
      default:
        throw new BadRequestException({
          details: [
            {
              field: 'submittedBy',
              message: 'Unsupported role for delegation submission',
            },
          ],
        });
    }
  }
}
