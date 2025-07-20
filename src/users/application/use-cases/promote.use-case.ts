import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Role } from 'src/shared/value-objects/role.vo';

interface PromoteInput {
  id: string;
  role: 'ADMIN' | 'MANAGER';
}

@Injectable()
export class PromoteUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute({ id, role }: PromoteInput) {
    const employee = await this.userRepo.findById(id);

    if (employee.role.getRole() !== 'EMPLOYEE') {
      throw new BadRequestException({ user: 'user_not_employee' });
    }

    employee.role = Role.create(role);

    await this.userRepo.save(employee);

    return null;
  }
}
