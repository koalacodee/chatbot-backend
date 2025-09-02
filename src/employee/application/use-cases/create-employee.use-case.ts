import { Injectable, ForbiddenException } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { EmployeePermissionsEnum } from '../../domain/entities/employee.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface CreateEmployeeUseCaseInput {
  userId: string;
  permissions: EmployeePermissionsEnum[];
  supervisorId: string;
  subDepartmentIds: string[];
}

interface CreateEmployeeUseCaseOutput {
  employee: Employee;
}

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly userRepository: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
  ) {}

  async execute(
    input: CreateEmployeeUseCaseInput,
    userId?: string,
  ): Promise<CreateEmployeeUseCaseOutput> {
    // Apply department access control for supervisors
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      
      if (userRole === Roles.SUPERVISOR) {
        const supervisor = await this.supervisorRepository.findByUserId(userId);
        const supervisorDepartmentIds = supervisor.departments.map((d) => d.id.toString());
        
        // Check if supervisor can assign employees to the requested sub-departments
        const hasAccess = input.subDepartmentIds.every((subDeptId) => 
          supervisorDepartmentIds.includes(subDeptId)
        );
        
        if (!hasAccess) {
          throw new ForbiddenException('You can only create employees in your assigned departments');
        }
      }
      // Admins have full access (no restrictions)
    }

    const employee = await Employee.create({
      userId: input.userId,
      permissions: input.permissions,
      supervisorId: input.supervisorId,
      subDepartments: await this.departmentRepository.findByIds(
        input.subDepartmentIds,
      ),
      user: await this.userRepository.findById(input.userId),
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    return { employee: savedEmployee };
  }
}
