import { Injectable } from '@nestjs/common';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { EmployeePermissions } from '../../domain/entities/employee.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { User } from 'src/shared/entities/user.entity';

interface UpdateEmployeeUseCaseInput {
  id: string;
  permissions?: EmployeePermissions[];
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
  ) {}

  async execute(
    input: UpdateEmployeeUseCaseInput,
  ): Promise<UpdateEmployeeUseCaseOutput> {
    const existingEmployee = await this.employeeRepository.findById(input.id);
    const existingUser = await this.userRepository.findById(existingEmployee.userId.toString())
    if (!existingEmployee) {
      throw new Error('Employee not found');
    }

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
    if (input.password) existingUser.changePassword(input.password)

    const updatedEmployee = await this.employeeRepository.update(
      input.id,
      updateEmployeeData,
    );

    await this.userRepository.save(existingUser)

    return { employee: updatedEmployee };
  }
}
