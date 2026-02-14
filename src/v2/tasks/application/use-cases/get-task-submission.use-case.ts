import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';

@Injectable()
export class GetTaskSubmissionUseCase {
  constructor(
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    submissionId: string,
    userId: string,
  ): Promise<{
    submission: ReturnType<typeof TaskSubmission.prototype.toJSON>;
    attachments: FilehubAttachmentMessage[];
  }> {
    const submission = await this.taskSubmissionRepo.findById(submissionId);
    if (!submission) {
      throw new NotFoundException({ submissionId: 'not_found' });
    }

    await this.validateAccess(submission.task, userId);

    // Fetch attachments
    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: [submissionId],
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return { submission: submission.toJSON(), attachments };
  }

  async executeByTaskId(
    taskId: string,
    userId: string,
  ): Promise<{
    taskSubmissions: ReturnType<typeof TaskSubmission.prototype.toJSON>[];
    delegationSubmissions: ReturnType<
      typeof TaskDelegationSubmission.prototype.toJSON
    >[];
    attachments: FilehubAttachmentMessage[];
  }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException({ taskId: 'not_found' });
    }

    await this.validateAccess(task, userId);

    const [taskSubmissions, delegationSubmissions] = await Promise.all([
      this.taskSubmissionRepo.findByTaskId(taskId),
      this.taskDelegationSubmissionRepo.findByTaskId(taskId, true),
    ]);

    const allSubmissionIds = [
      ...taskSubmissions.map((s) => s.id),
      ...delegationSubmissions.map((s) => s.id),
    ];

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: allSubmissionIds,
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      taskSubmissions: taskSubmissions.map((s) => s.toJSON()),
      delegationSubmissions: delegationSubmissions.map((s) => s.toJSON()),
      attachments,
    };
  }

  private async validateAccess(task: Task, userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) return;

    let hasAccess = false;

    if (userRole === Roles.SUPERVISOR) {
      if (
        task.assignmentType === TaskAssignmentType.INDIVIDUAL &&
        task.assignee
      ) {
        const assigneeEmployee = await this.employeeRepository.findById(
          task.assignee.id.toString(),
        );
        if (assigneeEmployee) {
          const supervisor =
            await this.supervisorRepository.findByUserId(userId);
          hasAccess =
            assigneeEmployee.supervisorId.toString() ===
            supervisor.id.toString();
        }
      } else if (task.targetDepartmentId) {
        const { hasAccess: deptAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            task.targetDepartmentId,
          );
        hasAccess = deptAccess;
      } else if (task.targetSubDepartmentId) {
        const { hasAccess: subDeptAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            task.targetSubDepartmentId,
          );
        hasAccess = subDeptAccess;
      }
    } else if (userRole === Roles.EMPLOYEE) {
      // Employees cannot see all the submissions of the task
      hasAccess = false;
    }

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to view this submission',
      );
    }
  }
}
