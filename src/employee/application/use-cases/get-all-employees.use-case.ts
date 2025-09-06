import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetAllEmployeesUseCaseOutput {
  employees: Employee[];
}

@Injectable()
export class GetAllEmployeesUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId?: string): Promise<GetAllEmployeesUseCaseOutput> {
    let employees: Employee[] = [];

    // Apply supervisor-based filtering
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Get employees that are directly supervised by this supervisor
        employees = await this.employeeRepository.findBySupervisorIds(
          [supervisor.id.toString()],
        );
      } else if (userRole === Roles.ADMIN) {
        // Admins see all employees
        employees = await this.employeeRepository.findAll();
      } else {
        // Employees typically shouldn't access this endpoint, but if they do, show all for now
        employees = await this.employeeRepository.findAll();
      }
    } else {
      // No userId provided, return all employees
      employees = await this.employeeRepository.findAll();
    }

    return { employees };
  }
}
