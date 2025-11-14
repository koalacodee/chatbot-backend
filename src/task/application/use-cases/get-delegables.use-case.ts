import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { Department } from 'src/department/domain/entities/department.entity';

interface GetDelegablesResult {
  employees: Employee[];
  subDepartments: Department[];
}

@Injectable()
export class GetDelegablesUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) { }

  async execute(userId: string, searchQuery?: string): Promise<GetDelegablesResult> {
    // Get the user and verify they are a supervisor
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'userId', message: 'User not found' }],
      });
    }

    const userRole = user.role.getRole();
    if (userRole !== Roles.SUPERVISOR) {
      throw new ForbiddenException({
        details: [
          {
            field: 'userId',
            message: 'Only supervisors can get delegables',
          },
        ],
      });
    }

    // Get the supervisor
    const supervisor = await this.supervisorRepository.findByUserId(userId);
    if (!supervisor) {
      throw new NotFoundException({
        details: [
          {
            field: 'userId',
            message: 'Supervisor not found for this user',
          },
        ],
      });
    }

    const supervisorDepartmentIds = supervisor.departments.map((d) =>
      d.id.toString(),
    );

    // Get delegable employees and sub-departments using database-level filtering
    const [employees, subDepartments] = await Promise.all([
      this.employeeRepository.findDelegableEmployees(
        supervisor.id.toString(),
        supervisorDepartmentIds,
        searchQuery,
      ),
      this.departmentRepository.findDelegableSubDepartments(
        supervisorDepartmentIds,
        undefined,
        searchQuery,
      ),
    ]);

    return {
      employees,
      subDepartments,
    };
  }
}

