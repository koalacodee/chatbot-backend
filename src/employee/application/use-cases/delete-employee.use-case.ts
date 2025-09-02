import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface DeleteEmployeeUseCaseInput {
  id: string;
}

interface DeleteEmployeeUseCaseOutput {
  employee: Employee | null;
}

@Injectable()
export class DeleteEmployeeUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: DeleteEmployeeUseCaseInput,
    userId?: string,
  ): Promise<DeleteEmployeeUseCaseOutput> {
    // First get the employee to check access before deletion
    const existingEmployee = await this.employeeRepository.findById(input.id);
    if (!existingEmployee) {
      return { employee: null };
    }

    // Apply supervisor-based access control
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Check if employee is directly supervised by this supervisor
        if (
          existingEmployee.supervisorId.toString() !== supervisor.id.toString()
        ) {
          throw new ForbiddenException(
            'You do not have access to delete this employee',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    const employee = await this.employeeRepository.removeById(input.id);
    return { employee };
  }
}
