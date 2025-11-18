import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

export interface ExpiredAttachment {
  id: string;
  filename: string;
  originalName: string;
  expirationDate: Date;
  userId: string | null;
  guestId: string | null;
  isGlobal: boolean;
}

@Injectable()
export class GetExpiredAttachmentsUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) { }

  async execute(userId?: string): Promise<ExpiredAttachment[]> {
    // Get department IDs for filtering if user is supervisor or employee
    const departmentIds = userId
      ? await this.getUserDepartmentIds(userId)
      : undefined;

    return this.repo.getExpiredAttachments(departmentIds);
  }

  private async getUserDepartmentIds(userId: string): Promise<string[] | undefined> {
    const user = await this.userRepository.findById(userId);
    const role = user.role.getRole();

    if (role === Roles.ADMIN) {
      return undefined; // Admins see all data
    } else if (role === Roles.SUPERVISOR) {
      const supervisor = await this.supervisorRepository.findByUserId(userId);
      const mainDepartmentIds = supervisor.departments.map((d) =>
        d.id.toString(),
      );

      // Get all sub-departments for supervisor's main departments
      const allDepartmentIds = [...mainDepartmentIds];
      for (const deptId of mainDepartmentIds) {
        const subDepartments =
          await this.departmentRepository.findSubDepartmentByParentId(deptId);
        allDepartmentIds.push(
          ...subDepartments.map((sub) => sub.id.toString()),
        );
      }

      return allDepartmentIds;
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      return (
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        []
      );
    }
    return [];
  }
}
