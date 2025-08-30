import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Roles } from 'src/shared/value-objects/role.vo';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';

@Injectable()
export class AccessControlService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly supervisorRepo: SupervisorRepository,
    private readonly driverRepo: DriverRepository,
  ) {}

  async canAccessDepartment(
    userId: string,
    departmentId: string,
  ): Promise<true> {
    const [user, department] = await Promise.all([
      this.userRepo.findById(userId, { includeEntity: true }),
      this.departmentRepo.findById(departmentId),
    ]);

    if (!user) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    if (user.role.getRole() === Roles.ADMIN) {
      return true;
    }

    if (!department) {
      throw new NotFoundException({ department: 'department_not_found' });
    }

    if (!user.supervisor.departments.some((d) => d.id === department.id)) {
      throw new ForbiddenException({
        department: 'forbidden_department_access',
      });
    }

    return true;
  }

  async canSupervisorAccessEmployeeOrDriver(
    userId: string,
    employeeId: string,
    role: 'employee' | 'driver',
  ): Promise<true> {
    const supervisor = await this.supervisorRepo.findByUserId(userId);

    const employeeOrDrive =
      role === 'driver'
        ? await this.driverRepo.findById(employeeId)
        : await this.employeeRepo.findById(employeeId);

    if (!employeeOrDrive) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    if (!supervisor) {
      throw new NotFoundException({ supervisor: 'supervisor_not_found' });
    }

    if (employeeOrDrive.supervisorId !== supervisor.id) {
      throw new ForbiddenException({
        department: 'forbidden_department_access',
      });
    }

    return true;
  }
}
