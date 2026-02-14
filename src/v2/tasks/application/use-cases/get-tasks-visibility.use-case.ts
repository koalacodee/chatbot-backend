import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';

@Injectable()
export class GetTasksVisibilityUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userId: string): Promise<{
    visibleDepartmentIds: string[];
    visibleSubDepartmentIds: string[];
  }> {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) {
      // Admins can see all departments
      const allDepartments = await this.departmentRepo.findAll();
      return {
        visibleDepartmentIds: allDepartments.map((d) => d.id.toString()),
        visibleSubDepartmentIds: allDepartments.map((d) => d.id.toString()),
      };
    }

    if (userRole === Roles.SUPERVISOR) {
      const departments = await this.departmentRepo.getSupervisorDepartments({
        supervisorIdOrUserId: { supervisorUserId: userId },
        fullDepartment: false,
      });
      const departmentIds = departments.map((d) => d.id);
      return {
        visibleDepartmentIds: departmentIds,
        visibleSubDepartmentIds: departmentIds,
      };
    }

    if (userRole === Roles.EMPLOYEE) {
      const subDepartments =
        await this.departmentRepo.getEmployeeSubDepartments(
          { employeeUserId: userId },
          false,
        );
      const subDepartmentIds = subDepartments.map((d) => d.id);
      return {
        visibleDepartmentIds: [],
        visibleSubDepartmentIds: subDepartmentIds,
      };
    }

    return { visibleDepartmentIds: [], visibleSubDepartmentIds: [] };
  }
}
