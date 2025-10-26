import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Admin } from 'src/admin/domain/entities/admin.entity';
import { AdminRepository } from 'src/admin/domain/repositories/admin.repository';
import { TokensService } from 'src/auth/domain/services/tokens.service';
import { Driver } from 'src/driver/domain/entities/driver.entity';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { Employee } from 'src/employee/domain/entities/employee.entity';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { Supervisor } from 'src/supervisor/domain/entities/supervisor.entity';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

interface ResetPasswordInput {
  code: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  private readonly RESET_CODE_PREFIX = 'reset_password_code:';

  constructor(
    private readonly userRepo: UserRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly adminRepository: AdminRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly driverRepository: DriverRepository,
    private readonly tokenService: TokensService,
    private readonly redisService: RedisService,
  ) {}

  async execute(input: ResetPasswordInput) {
    // Get user ID from Redis using the code
    const key = `${this.RESET_CODE_PREFIX}${input.code}`;
    const userId = await this.redisService.get(key);

    if (!userId) {
      throw new BadRequestException({
        details: [{ field: 'code', message: 'Invalid or expired reset code' }],
      });
    }

    // Get user from database
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundException({
        details: [{ field: 'code', message: 'User not found' }],
      });
    }

    // Update user's password
    await user.changePassword(input.newPassword);
    await this.userRepo.save(user);

    // Delete the reset code from Redis
    await this.redisService.del(key);

    // Get the user's role-specific entity (same logic as login)
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

    // Generate tokens (same as login)
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
