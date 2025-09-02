import { Injectable, NotFoundException } from '@nestjs/common';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

interface LoginInput {
  username: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly driverRepository: DriverRepository,
    private readonly tokenService: TokensService,
  ) {}

  async execute(input: LoginInput) {
    const user = await this.userRepo.findByUsername(input.username);

    if (!user) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    await user.password.verify(input.password);

    let entity: Supervisor | Admin | Driver | Employee;

    switch (user.role.getRole()) {
      case Roles.ADMIN:
        entity = await this.adminRepository.findByUserId(user.id);
        break;
      case Roles.SUPERVISOR:
        entity = await this.supervisorRepository.findByUserId(user.id);
        break;
      case Roles.DRIVER:
        entity = await this.driverRepository.findByUserId(user.id);
        break;
      case Roles.EMPLOYEE:
        entity = await this.employeeRepository.findByUserId(user.id);
        break;

      default:
        break;
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email.getValue(),
      user.role.getRole(),
      (entity as any)?.permissions,
    );

    return {
      user: user.withoutPassword(),
      ...tokens,
    };
  }
}
