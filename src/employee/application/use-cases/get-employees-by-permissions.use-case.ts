import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetEmployeesByPermissionsUseCaseInput {
  permissions: string[];
}

interface GetEmployeesByPermissionsUseCaseOutput {
  employees: Employee[];
}

@Injectable()
export class GetEmployeesByPermissionsUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: GetEmployeesByPermissionsUseCaseInput,
    userId?: string,
  ): Promise<GetEmployeesByPermissionsUseCaseOutput> {
    let employees: Employee[] = [];

    // Apply supervisor-based filtering
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Get employees that are directly supervised by this supervisor
        employees = await this.employeeRepository.findBySupervisorId(
          supervisor.id.toString(),
        );

        // Filter to only include employees with the required permissions
        employees = employees.filter((employee) =>
          input.permissions.every((permission) =>
            employee.permissions.includes(permission as any),
          ),
        );
      } else if (userRole === Roles.ADMIN) {
        // Admins see all employees with the specified permissions
        employees = await this.employeeRepository.findByPermissions(
          input.permissions,
        );
      } else {
        // Employees typically shouldn't access this endpoint, but if they do, show all for now
        employees = await this.employeeRepository.findByPermissions(
          input.permissions,
        );
      }
    } else {
      // No userId provided, return all employees with the specified permissions
      employees = await this.employeeRepository.findByPermissions(
        input.permissions,
      );
    }

    return { employees };
  }
}
