import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';

interface GetAuthorizedUserRequest {
  userId: string;
}

interface GetAuthorizedUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class GetAuthorizedUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
  ) {}

  async execute(
    request: GetAuthorizedUserRequest,
  ): Promise<GetAuthorizedUserResponse> {
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const roleEntity = await this.getRoleEntity(user);

    return {
      ...user.withoutPassword(),
      permissions: roleEntity instanceof Admin ? [] : roleEntity.permissions,
    };
  }

  async getRoleEntity(user: User): Promise<Supervisor | Admin | Employee> {
    switch (user.role.getRole()) {
      case 'ADMIN':
        return this.adminRepository.findByUserId(user.id);
      case 'SUPERVISOR':
        return this.supervisorRepository.findByUserId(user.id);
      case 'EMPLOYEE':
        return this.employeeRepository.findByUserId(user.id);
      default:
        throw new Error('Invalid role');
    }
  }
}
