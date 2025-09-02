import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GetEmployeeByUserIdUseCaseInput {
  userId: string;
}

interface GetEmployeeByUserIdUseCaseOutput {
  employee: Employee | null;
}

@Injectable()
export class GetEmployeeByUserIdUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    input: GetEmployeeByUserIdUseCaseInput,
    userId?: string,
  ): Promise<GetEmployeeByUserIdUseCaseOutput> {
    const employee = await this.employeeRepository.findByUserId(input.userId);

    if (!employee) {
      return { employee: null };
    }

    // Apply supervisor-based access control
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);

        // Check if employee is directly supervised by this supervisor
        if (employee.supervisorId.toString() !== supervisor.id.toString()) {
          throw new ForbiddenException(
            'You do not have access to this employee',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    return { employee };
  }
}
