import { Injectable, ForbiddenException } from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';

@Injectable()
export class GetEmployeesWithTicketHandlingPermissionsUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) {}

  async execute(userId: string): Promise<Employee[]> {
    // Get user and validate role
    const user = await this.userRepository.findById(userId);
    const userRole = user.role.getRole();

    if (userRole === Roles.ADMIN) {
      // Admins can see all employees with HANDLE_TICKETS permissions
      return this.employeeRepository.findByPermissions([
        EmployeePermissionsEnum.HANDLE_TICKETS,
      ]);
    }

    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'role',
            message: 'Only supervisors can access this endpoint',
          },
        ],
      });
    }

    // Get supervisor's department access
    const supervisor = await this.supervisorRepository.findByUserId(userId);
    const mainDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    // Get all sub-departments for supervisor's main departments
    const allDepartmentIds = [...mainDepartmentIds];
    for (const deptId of mainDepartmentIds) {
      const subDepartments =
        await this.departmentRepository.findSubDepartmentByParentId(deptId);
      allDepartmentIds.push(...subDepartments.map((sub) => sub.id.toString()));
    }

    // Get employees with HANDLE_TICKETS permissions filtered by departments at database level
    return this.employeeRepository.findByPermissionsAndDepartments(
      [EmployeePermissionsEnum.HANDLE_TICKETS],
      allDepartmentIds,
    );
  }
}
