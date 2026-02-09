import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TaskSubmissionRepository } from '../../domain/repositories/task-submission.repository';
import { TaskDelegationRepository } from '../../domain/repositories/task-delegation.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';
import { AttachmentRepository } from '@/filehub/domain/repositories/attachment.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import {
  Task,
  TaskAssignmentType,
  TaskStatus,
} from '../../domain/entities/task.entity';

@Injectable()
export class DeleteTaskUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly attachmentRepo: AttachmentRepository,
  ) {}

  async execute(id: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findById(id);
    if (!task) throw new NotFoundException({ id: 'task_not_found' });

    // Check access
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    await this.validateDeleteAccess(userId, task, userRole);

    await this.attachmentRepo.removeByTargetId(id);
    await this.taskRepo.removeById(id);

    return task;
  }

  private async validateDeleteAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) {
      return; // Admins can delete any task
    }

    // Only creators can delete their own tasks
    if (task.creatorId === userId) {
      return;
    }

    if (role === Roles.SUPERVISOR) {
      if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        throw new ForbiddenException(
          'Only admins can delete department-level tasks',
        );
      }

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
            await this.employeeRepo.supervisorHasAccessToEmployee({
              supervisor: {
                supervisorUserId: userId,
              },
              employee: {
                employeeId: task.assigneeId,
              },
            });
          if (hasAccess) return;
        }
      }
    }

    throw new ForbiddenException(
      'You do not have permission to delete this task',
    );
  }
}
