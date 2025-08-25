import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { EmployeePermissions } from '../../domain/entities/employee.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

interface CreateEmployeeUseCaseInput {
  userId: string;
  permissions: EmployeePermissions[];
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
  ) {}

  async execute(
    input: CreateEmployeeUseCaseInput,
  ): Promise<CreateEmployeeUseCaseOutput> {
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
