import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Task,
  TaskAssignmentType,
  TaskStatus,
} from '../../domain/entities/task.entity';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { EmployeeRepository } from '@/employee/domain/repositories/employee.repository';
import { Roles } from '@/shared/value-objects/role.vo';

interface MarkTaskSeenInputDto {
  taskId: string;
}

@Injectable()
export class MarkTaskSeenUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly userRepo: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(
    dto: MarkTaskSeenInputDto,
    userId?: string,
  ): Promise<{
    task: ReturnType<typeof Task.prototype.toJSON>;
  }> {
    const existing = await this.taskRepo.findById(dto.taskId);
    if (!existing) throw new NotFoundException({ id: 'task_not_found' });

    // Skip if Task is already "SEEN" for performance
    if (existing.status === TaskStatus.SEEN) {
      return { task: existing.toJSON() };
    }

    // Validate access if userId is provided
    if (userId) {
      const user = await this.userRepo.findById(userId);
      const userRole = user.role.getRole();
      await this.validateAccess(userId, existing, userRole);
    }

    existing.status = TaskStatus.SEEN;
    const savedTask = await this.taskRepo.save(existing);

    return { task: savedTask.toJSON() };
  }

  private async validateAccess(
    userId: string,
    task: Task,
    role: Roles,
  ): Promise<void> {
    if (role === Roles.ADMIN) return;

    if (role === Roles.SUPERVISOR) {
      // Check for hierarchical access to the task's department or assignee
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
      } else if (task.assignmentType === TaskAssignmentType.DEPARTMENT) {
        if (task.targetDepartmentId) {
          const { hasAccess } =
            await this.departmentRepo.supervisorHasAccessToDepartment(
              { supervisorUserId: userId },
              task.targetDepartmentId,
            );
          if (hasAccess) return;
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const isAssigned = task.assigneeId === userId;
      if (isAssigned) return;

      if (task.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            task.targetSubDepartmentId,
          );
        if (hasAccess) return;
      } else if (task.assigneeId) {
        const employee = await this.employeeRepository.findByUserId(userId);
        if (employee) {
          if (employee.id.toString() === task.assigneeId) {
            return;
          }
        }
      }
    }

    throw new ForbiddenException(
      'You do not have access to mark this task as seen',
    );
  }
}
