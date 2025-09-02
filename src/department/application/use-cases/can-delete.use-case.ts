import { Injectable, ForbiddenException } from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class CanDeleteUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute({
    id,
    isSubDepartment = false,
    userId,
  }: {
    id: string;
    isSubDepartment?: boolean;
    userId?: string;
  }): Promise<boolean> {
    // Check access control if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to this department
        const hasAccess = await this.departmentRepo.validateDepartmentAccess(
          id,
          supervisorDepartmentIds,
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this department',
          );
        }
      } else if (userRole === Roles.EMPLOYEE) {
        const employee = await this.employeeRepository.findByUserId(userId);
        const employeeDepartmentIds =
          employee?.subDepartments.map((dep) => dep.id.toString()) ??
          employee?.supervisor?.departments.map((d) => d.id.toString()) ??
          [];

        // Check if employee has access to this department
        const hasAccess = await this.departmentRepo.validateDepartmentAccess(
          id,
          employeeDepartmentIds,
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this department',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    return await this.departmentRepo.canDelete(id, isSubDepartment);
  }
}
