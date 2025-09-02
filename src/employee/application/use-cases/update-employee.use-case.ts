import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { User } from 'src/shared/entities/user.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface UpdateEmployeeUseCaseInput {
  id: string;
  permissions?: EmployeePermissionsEnum[];
  supervisorId?: string;
  subDepartmentIds?: string[];
  jobTitle?: string;
  employeeId?: string;
  password?: string;
}

interface UpdateEmployeeUseCaseOutput {
  employee: Employee;
}

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    input: UpdateEmployeeUseCaseInput,
    userId?: string,
  ): Promise<UpdateEmployeeUseCaseOutput> {
    const existingEmployee = await this.employeeRepository.findById(input.id);
    if (!existingEmployee) {
      throw new Error('Employee not found');
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
            'You do not have access to update this employee',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    const existingUser = await this.userRepository.findById(
      existingEmployee.userId.toString(),
    );

    const updateEmployeeData: Partial<Employee> = {};
    if (input.permissions !== undefined)
      updateEmployeeData.permissions = input.permissions;
    if (input.supervisorId !== undefined)
      updateEmployeeData.supervisorId = UUID.create(input.supervisorId);
    if (input.subDepartmentIds !== undefined)
      updateEmployeeData.subDepartments = await this.departmentRepo.findByIds(
        input.subDepartmentIds,
      );

    if (input.employeeId) existingUser.employeeId = input.employeeId;
    if (input.jobTitle) existingUser.jobTitle = input.jobTitle;
    if (input.password) existingUser.changePassword(input.password);

    const updatedEmployee = await this.employeeRepository.update(
      input.id,
      updateEmployeeData,
    );

    await this.userRepository.save(existingUser);

    return { employee: updatedEmployee };
  }
}
