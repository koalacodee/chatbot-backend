import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetEmployeesBySubDepartmentUseCaseOutput {
  employees: Employee[];
}

interface GetEmployeesBySubDepartmentInput {
  subDepartmentId: string;
}

@Injectable()
export class GetEmployeesBySubDepartmentUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(
    dto: GetEmployeesBySubDepartmentInput,
    userId?: string,
  ): Promise<GetEmployeesBySubDepartmentUseCaseOutput> {
    // Apply department access control for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor has access to this sub-department through its parent
        const hasAccess =
          await this.departmentRepository.validateDepartmentAccess(
            dto.subDepartmentId,
            supervisorDepartmentIds,
          );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this sub-department',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    const employees = await this.employeeRepository.findBySubDepartment(
      dto.subDepartmentId,
    );
    return { employees };
  }
}
