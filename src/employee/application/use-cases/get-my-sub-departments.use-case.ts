import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from '../../domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetMySubDepartmentsUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<Array<{ id: string; name: string }>> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.role.getRole() !== Roles.EMPLOYEE) {
      return [];
    }

    const employee = await this.employeeRepository.findByUserId(userId);
    if (!employee || !employee.subDepartments?.length) {
      return [];
    }

    return employee.subDepartments.map((d) => ({
      id: d.id.toString(),
      name: d.name,
    }));
  }
}
