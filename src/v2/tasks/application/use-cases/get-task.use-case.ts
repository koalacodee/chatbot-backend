import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  FilehubAttachmentMessage,
  GetTargetAttachmentsWithSignedUrlsUseCase,
} from '@/filehub/application/use-cases/get-target-attachments-with-signed-urls.use-case';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { TaskSubmission } from '../../domain/entities/task-submission.entity';
import { TaskDelegationSubmission } from '../../domain/entities/task-delegation-submission.entity';

@Injectable()
export class GetTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly getTargetAttachmentsWithSignedUrlsUseCase: GetTargetAttachmentsWithSignedUrlsUseCase,
  ) {}

  async execute(
    id: string,
    userId?: string,
  ): Promise<{
    task: ReturnType<typeof Task.prototype.toJSON>;
    submissions: ReturnType<typeof TaskSubmission.prototype.toJSON>[];
    delegationSubmissions: ReturnType<
      typeof TaskDelegationSubmission.prototype.toJSON
    >[];
    attachments: FilehubAttachmentMessage[];
  }> {
    const result = await this.taskRepo.findByIdWithSubmissions(id);
    if (!result) throw new NotFoundException({ id: 'task_not_found' });

    const { task, submissions: taskSubmissions } = result;

    // Check access
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.checkTaskAccess(userId, task, userRole);
    }

    const delegationSubmissions =
      await this.taskDelegationSubmissionRepo.findByTaskId(id, true);

    // Fetch attachments
    const allTargetIds = [
      id,
      ...taskSubmissions.map((s) => s.id),
      ...delegationSubmissions.map((s) => s.id),
    ];

    const attachments =
      await this.getTargetAttachmentsWithSignedUrlsUseCase.execute({
        targetIds: allTargetIds,
        expiresInMs: 1000 * 60 * 60 * 24 * 7,
      });

    return {
      task: task.toJSON(),
      submissions: taskSubmissions.map((s) => s.toJSON()),
      delegationSubmissions: delegationSubmissions.map((s) => s.toJSON()),
      attachments,
    };
  }

  private async checkTaskAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true;
    } else if (role === Roles.SUPERVISOR) {
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
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const isAssignedToEmployee =
        task.assignee?.id.toString() === employee?.id.toString();

      if (isAssignedToEmployee) {
        hasAccess = true;
      } else if (task.targetSubDepartmentId) {
        const { hasAccess: subDeptAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            task.targetSubDepartmentId,
          );
        hasAccess = subDeptAccess;
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to view this task');
    }
  }
}
