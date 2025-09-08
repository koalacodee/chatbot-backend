import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { User } from 'src/shared/entities/user.entity';

interface CreateEmployeeDirectUseCaseInput {
  email: string;
  fullName: string;
  username: string;
  jobTitle: string;
  employeeId: string;
  password: string;
  designation?: string;
  permissions: EmployeePermissionsEnum[];
  supervisorId: string;
  subDepartmentIds: string[];
}

interface CreateEmployeeDirectUseCaseOutput {
  employee: Employee;
  user: any;
}

@Injectable()
export class CreateEmployeeDirectUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    input: CreateEmployeeDirectUseCaseInput,
    requestingUserId?: string,
  ): Promise<CreateEmployeeDirectUseCaseOutput> {
    // Apply department access control for supervisors
    if (requestingUserId) {
      const user = await this.userRepository.findById(requestingUserId);
      const userRole = user.role.getRole();

      if (userRole === Roles.SUPERVISOR) {
        const supervisor =
          await this.supervisorRepository.findByUserId(requestingUserId);
        const supervisorDepartmentIds = supervisor.departments.map((d) =>
          d.id.toString(),
        );

        // Check if supervisor can assign employees to the requested sub-departments
        const hasAccess = input.subDepartmentIds.every((subDeptId) =>
          supervisorDepartmentIds.includes(subDeptId),
        );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You can only create employees in your assigned departments',
          );
        }

        // Ensure supervisor can only create employees under themselves
        if (input.supervisorId !== supervisor.id.toString()) {
          throw new ForbiddenException(
            'You can only create employees under your supervision',
          );
        }
      }
      // Admins have full access (no restrictions)
    }

    // Create user first
    const user = await User.create({
      name: input.fullName,
      email: input.email,
      username: input.username,
      password: input.password,
      role: Roles.EMPLOYEE,
      employeeId: input.employeeId,
      jobTitle: input.jobTitle,
    });

    // Create employee
    const employee = await Employee.create({
      userId: user.id,
      permissions: input.permissions,
      supervisorId: input.supervisorId,
      subDepartments: await this.departmentRepository.findByIds(
        input.subDepartmentIds,
      ),
      user: user,
    });

    const [savedEmployee, savedUser] = await Promise.all([
      this.employeeRepository.save(employee),
      this.userRepository.save(user),
    ]);

    return { employee: savedEmployee, user: savedUser };
  }
}
