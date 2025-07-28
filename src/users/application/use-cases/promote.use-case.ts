import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Role } from 'src/shared/value-objects/role.vo';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface PromoteInput {
  id: string;
  role: 'ADMIN' | 'MANAGER';
  departmentId?: string;
}

@Injectable()
export class PromoteUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
  ) {}

  async execute({ id, role, departmentId }: PromoteInput) {
    const employee = await this.userRepo.findById(id);

    if (employee.role.getRole() !== 'EMPLOYEE') {
      throw new BadRequestException({ user: 'user_not_employee' });
    }

    employee.role = Role.create(role);

    if (role === 'ADMIN') {
      if (!(await this.departmentRepo.exists(departmentId))) {
        throw new NotFoundException({ departmentId: 'department_not_found' });
      }

      employee.departmentId = UUID.create(departmentId);
    }

    await this.userRepo.save(employee);

    return null;
  }
}
