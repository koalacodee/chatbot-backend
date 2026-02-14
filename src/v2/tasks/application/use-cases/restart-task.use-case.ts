import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { TaskDelegationSubmissionRepository } from '../../domain/repositories/task-delegation-submission.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { Task, TaskAssignmentType } from '../../domain/entities/task.entity';
import { TaskRestartedEvent } from '../../domain/events/task-restarted.event';

@Injectable()
export class RestartTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly taskSubmissionRepo: TaskSubmissionRepository,
    private readonly taskDelegationRepo: TaskDelegationRepository,
    private readonly taskDelegationSubmissionRepo: TaskDelegationSubmissionRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Restarts a task by reverting it to TODO status and DELETING all associated
   * submissions, delegations, and delegation submissions for a clean state.
   */
  async execute(
    taskId: string,
    userId: string,
  ): Promise<ReturnType<typeof Task.prototype.toJSON>> {
    // 1. Fix security bug: check existence before permissions
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundException({ taskId: 'not_found' });
    }

    // 4. Validate restart rights (Hierarchy support)
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();
    await this.validateRestartRights(userId, task, userRole);

    // 2. Cascade delete associated data for a clean state
    await Promise.all([
      this.taskSubmissionRepo.deleteByTaskId(taskId),
      this.taskDelegationRepo.deleteByTaskId(taskId),
      this.taskDelegationSubmissionRepo.deleteByTaskId(taskId),
    ]);

    // 5. Revert task to clean TODO status
    await this.taskRepo.restart(taskId);

    // Refresh task state for response
    const restartedTask = await this.taskRepo.findById(taskId);

    // 3. Emit restart event
    await this.eventEmitter.emitAsync(
      'task.restarted',
      new TaskRestartedEvent(taskId, userId, new Date()),
    );

    return restartedTask.toJSON();
  }

  private async validateRestartRights(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return;
    }

    // Creator always has access
    if (task.creatorId === userId) {
      return;
    }

    if (role === Roles.SUPERVISOR) {
      // Support a supervisor who has access to the task (sub-department or assignee)
      if (task.assignmentType === TaskAssignmentType.SUB_DEPARTMENT) {
        if (task.targetSubDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetSubDepartmentId,
            );
          if (hasAccess) return;
        }
      } else if (task.assignmentType === TaskAssignmentType.INDIVIDUAL) {
        if (task.assigneeId) {
          const hasAccess =
            await this.employeeRepository.supervisorHasAccessToEmployee({
              supervisor: { supervisorUserId: userId },
              employee: { employeeUserId: task.assigneeId },
            });
          if (hasAccess) return;
        }
      }
    }

    throw new ForbiddenException(
      'You do not have permission to restart this task',
    );
  }
}
