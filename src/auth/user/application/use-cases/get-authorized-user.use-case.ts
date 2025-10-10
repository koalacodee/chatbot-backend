import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { User } from 'src/shared/entities/user.entity';
import { GetUserProfilePictureUseCase } from 'src/profile/application/use-cases/get-user-profile-picture.use-case';

interface GetAuthorizedUserRequest {
  userId: string;
}

interface GetAuthorizedUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  departmentNames?: string[];
}

@Injectable()
export class GetAuthorizedUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly getUserProfilePicture: GetUserProfilePictureUseCase,
  ) {}

  async execute(
    request: GetAuthorizedUserRequest,
  ): Promise<GetAuthorizedUserResponse> {
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const roleEntity = await this.getRoleEntity(user);
    const profilePicture = await this.getUserProfilePicture.execute({
      userId: user.id,
    });

    const departmentNames = this.getDepartmentNames(roleEntity);

    return {
      ...user.withoutPassword(),
      profilePicture: profilePicture?.profilePicture?.id,
      permissions: roleEntity instanceof Admin ? [] : roleEntity.permissions,
      departmentNames,
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

  private getDepartmentNames(
    roleEntity: Supervisor | Admin | Employee,
  ): string[] | undefined {
    if (roleEntity instanceof Admin) {
      return undefined;
    }

    if (roleEntity instanceof Supervisor) {
      return roleEntity.departments?.map((dept) => dept.name) || [];
    }

    if (roleEntity instanceof Employee) {
      return roleEntity.subDepartments?.map((dept) => dept.name) || [];
    }

    return undefined;
  }
}
