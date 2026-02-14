import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { RejectTaskSubmissionUseCase } from './reject-task-submission.use-case';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { SupervisorRepository } from '@/supervisor/domain/repository/supervisor.repository';
import { AdminRepository } from '@/admin/domain/repositories/admin.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import {
  TaskStatus,
  TaskAssignmentType,
  Task,
} from '../../domain/entities/task.entity';
import { TaskSubmissionStatus } from '../../domain/entities/task-submission.entity';
import { TaskRejectedEvent } from '../../domain/events/task-rejected.event';

@Injectable()
export class RejectTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly rejectTaskSubmissionUseCase: RejectTaskSubmissionUseCase,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    taskId: string,
    userId: string,
    reason?: string,
  ): Promise<ReturnType<typeof Task.prototype.toJSON>> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException({ taskId: 'not_found' });
    }

    if (task.status !== TaskStatus.PENDING_REVIEW) {
      throw new BadRequestException('Task must be in PENDING_REVIEW status');
    }

    // Validate rejection rights (batch operation typically requires same rights as individual)
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();
    await this.validateRejectionRights(userId, task, userRole);

    // Fetch only pending submissions at DB level
    const [pendingSubmissions, pendingDelegations] = await Promise.all([
      this.taskSubmissionRepo.findByTaskId(
        taskId,
        TaskSubmissionStatus.SUBMITTED,
      ),
      this.taskDelegationSubmissionRepo.findByTaskId(
        taskId,
        true,
        TaskSubmissionStatus.SUBMITTED,
      ),
    ]);

    if (pendingSubmissions.length === 0 && pendingDelegations.length === 0) {
      throw new BadRequestException(
        'No pending submissions found for this task',
      );
    }

    // Resolve reviewer for delegation submissions if needed
    const reviewer =
      userRole === Roles.ADMIN
        ? await this.adminRepository.findByUserId(userId)
        : await this.supervisorRepository.findByUserId(userId);

    // Reject all via Promise.all
    await Promise.all([
      // Regular submissions via UseCase (handles events/validation)
      ...pendingSubmissions.map((s) =>
        this.rejectTaskSubmissionUseCase.execute(s.id, userId, reason),
      ),
      // Delegation submissions (manual for now as no UseCase exists)
      ...pendingDelegations.map((s) => {
        s.reject(reviewer, reason);
        return this.taskDelegationSubmissionRepo.save(s);
      }),
      // Delegation events
      ...pendingDelegations.map((s) =>
        this.eventEmitter.emitAsync(
          'task.rejected',
          new TaskRejectedEvent(
            task.id,
            task.title,
            task.assigneeId,
            s.performerId,
            new Date(),
            reason,
          ),
        ),
      ),
    ]);

    // Update task status back to TODO
    task.status = TaskStatus.TODO;
    await this.taskRepo.save(task);

    return task.toJSON();
  }

  private async validateRejectionRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return;
    }

    if (role === Roles.SUPERVISOR) {
      if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        throw new ForbiddenException(
          'Only admins can reject department-level tasks',
        );
      }

      if (task.assignmentType === TaskAssignmentType.SUB_DEPARTMENT) {
        if (task.targetSubDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetSubDepartmentId,
            );
          if (!hasAccess) {
            throw new ForbiddenException(
              'You do not have permission to reject this task',
            );
          }
        }
      } else if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: { supervisorUserId: userId },
              employee: { employeeUserId: task.assigneeId },
            });
          if (!hasAccess) {
            throw new ForbiddenException(
              'You do not have permission to reject this task',
            );
          }
        }
      }
    } else {
      throw new ForbiddenException(
        'Only admins and supervisors can reject tasks',
      );
    }
  }
}
