import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';

@Injectable()
export class GetTaskVisibilityUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(
    taskId: string,
    userId: string,
  ): Promise<{ canView: boolean; canEdit: boolean; canDelete: boolean }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return { canView: false, canEdit: false, canDelete: false };
    }

    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) {
      return { canView: true, canEdit: true, canDelete: true };
    }

    let canView = false;
    let canEdit = false;
    let canDelete = false;

    if (userRole === Roles.SUPERVISOR) {
      // Check if supervisor has access to the task's department/sub-department
      if (task.targetDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            task.targetDepartmentId,
          );
        canView = hasAccess;
        canEdit = hasAccess;
      } else if (task.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.supervisorHasAccessToDepartment(
            { supervisorUserId: userId },
            task.targetSubDepartmentId,
          );
        canView = hasAccess;
        canEdit = hasAccess;
      }

      // Check if task creator
      if (task.creatorId === userId) {
        canView = true;
        canEdit = true;
        canDelete = true;
      }
    } else if (userRole === Roles.EMPLOYEE) {
      // Employees can view/edit tasks assigned to them or their sub-department
      if (task.assignee?.id.toString() === userId) {
        canView = true;
        canEdit = true;
      } else if (task.targetSubDepartmentId) {
        const { hasAccess } =
          await this.departmentRepo.employeeHasAccessToSubDepartment(
            { employeeUserId: userId },
            task.targetSubDepartmentId,
          );
        canView = hasAccess;
        canEdit = hasAccess;
      }
    }

    return { canView, canEdit, canDelete };
  }
}
