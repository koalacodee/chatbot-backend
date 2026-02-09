import { Injectable } from '@nestjs/common';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { DepartmentRepository } from '@/department/domain/repositories/department.repository';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Roles } from '@/shared/value-objects/role.vo';

@Injectable()
export class CountTasksUseCase {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userId: string): Promise<number> {
    const user = await this.userRepo.findById(userId);
    const userRole = user.role.getRole();

    let departmentIds: string[] = [];

    if (userRole === Roles.SUPERVISOR) {
      const departments = await this.departmentRepo.getSupervisorDepartments({
        supervisorIdOrUserId: { supervisorUserId: userId },
        fullDepartment: false,
      });
      departmentIds = departments.map((d) => d.id);
    } else if (userRole === Roles.EMPLOYEE) {
      const subDepartments =
        await this.departmentRepo.getEmployeeSubDepartments(
          { employeeUserId: userId },
          false,
        );
      departmentIds = subDepartments.map((d) => d.id);
    }

    return this.taskRepo.count({
      departmentIds: userRole === Roles.ADMIN ? undefined : departmentIds,
    });
  }
}
