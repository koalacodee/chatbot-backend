import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { DriverRepository } from 'src/driver/domain/repositories/driver.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { User } from 'src/shared/entities/user.entity';
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
    const user = await this.userRepo.findById(userId, { includeEntity: true });

    if (!user) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    if (user.role.getRole() === Roles.ADMIN) {
      return true;
    }

    // Loaded after the admin check rather than alongside the user: admins never consult
    // it, and this method is on the hot path for every knowledge-chunk read.
    const department = await this.departmentRepo.findById(departmentId);

    if (!department) {
      throw new NotFoundException({ department: 'department_not_found' });
    }

    const held = await this.departmentIdsFor(user);

    // Compared by value. This was `d.id === department.id` — two `UUID` *instances*, so
    // reference equality, which is never true for objects loaded by separate queries.
    // Every non-admin was refused, always.
    if (!held.includes(department.id.value)) {
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

    // The caller's own identity is settled first, so a caller who is not a supervisor is
    // told that rather than being told the staff member does not exist.
    if (!supervisor) {
      throw new NotFoundException({ supervisor: 'supervisor_not_found' });
    }

    const employeeOrDriver =
      role === 'driver'
        ? await this.driverRepo.findById(employeeId)
        : await this.employeeRepo.findById(employeeId);

    if (!employeeOrDriver) {
      throw new NotFoundException({ user: 'user_not_found' });
    }

    // Same defect as above: `!==` on two `UUID` instances refused every supervisor
    // access to their own staff.
    if (employeeOrDriver.supervisorId.value !== supervisor.id.value) {
      throw new ForbiddenException({
        department: 'forbidden_department_access',
      });
    }

    return true;
  }

  /**
   * The departments a non-admin caller may reach.
   *
   * `user.supervisor` used to be dereferenced unguarded, which meant every role without
   * that relation — employees, drivers, guests — raised a TypeError instead of a 403.
   * Employees are resolved through their own row, matching how the rest of the codebase
   * scopes them.
   */
  private async departmentIdsFor(user: User): Promise<string[]> {
    switch (user.role.getRole()) {
      case Roles.SUPERVISOR: {
        const supervisor =
          user.supervisor ?? (await this.supervisorRepo.findByUserId(user.id));
        return supervisor?.departments.map((d) => d.id.value) ?? [];
      }
      case Roles.EMPLOYEE: {
        const employee = await this.employeeRepo.findByUserId(user.id);
        return employee?.subDepartments.map((d) => d.id.value) ?? [];
      }
      default:
        return [];
    }
  }
}
