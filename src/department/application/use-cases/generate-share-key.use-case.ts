import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

interface GenerateShareKeyDto {
  departmentId: string;
  userId?: string;
}

@Injectable()
export class GenerateShareKeyUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ departmentId, userId }: GenerateShareKeyDto) {
    const department = await this.departmentRepository.findById(departmentId);

    if (!department) {
      throw new NotFoundException({
        details: [{ field: 'departmentId', message: 'Department not found' }],
      });
    }

    // Check department access if userId is provided
    if (userId) {
      const user = await this.userRepository.findById(userId);
      const userRole = user.role.getRole();
      await this.checkDepartmentAccess(userId, departmentId, userRole);
    }

    const key = randomBytes(
      this.config.get('SHARE_LINK_KEY_LENGTH', 64),
    ).toString('hex');

    await this.redis.set(
      key,
      department.id.toString(),
      this.config.get('SHARE_LINK_EXPIRY', undefined),
    );

    return { key };
  }

  private async checkDepartmentAccess(
    userId: string,
    departmentId: string,
    role: Roles,
  ): Promise<void> {
    let hasAccess = false;

    if (role === Roles.ADMIN) {
      hasAccess = true; // Admins have access to all departments
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const supervisorDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Check if supervisor has direct access to the department
      hasAccess = supervisorDepartmentIds.includes(departmentId);

      // If not direct access, check if it's a sub-department and supervisor has access to parent
      if (!hasAccess) {
        const department =
          await this.departmentRepository.findSubDepartmentById(departmentId, {
            includeParent: true,
          });
        if (department?.parent) {
          hasAccess = supervisorDepartmentIds.includes(
            department.parent.id.toString(),
          );
        }
      }
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const employeeDepartmentIds =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];
      hasAccess = employeeDepartmentIds.includes(departmentId);
    }

    if (!hasAccess) {
      throw new ForbiddenException({
        details: [
          {
            field: 'departmentId',
            message: 'You do not have access to this department',
          },
        ],
      });
    }
  }
}
