import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DashboardRepository,
  DashboardSummary,
} from '../../domain/repositories/dashboard.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetDashboardSummaryUseCase {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) { }

  async execute(
    userId?: string,
    departmentId?: string,
  ): Promise<DashboardSummary> {
    const departmentIds = await this.getUserDepartmentIds(
      userId,
      departmentId,
    );

    return this.repo.getSummary(departmentIds);
  }

  private async getUserDepartmentIds(
    userId?: string,
    requestedDepartmentId?: string,
  ): Promise<string[] | undefined> {
    if (!userId) {
      return requestedDepartmentId ? [requestedDepartmentId] : undefined;
    }

    const user = await this.userRepository.findById(userId);
    const role = user.role.getRole();

    if (role === Roles.ADMIN) {
      return requestedDepartmentId ? [requestedDepartmentId] : undefined;
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

      if (!requestedDepartmentId) {
        return allDepartmentIds;
      }

      if (!allDepartmentIds.includes(requestedDepartmentId)) {
        throw new ForbiddenException(
          'You do not have access to the requested department.',
        );
      }

      return [requestedDepartmentId];
    } else if (role === Roles.EMPLOYEE) {
      const employee = await this.employeeRepository.findByUserId(userId);
      const accessibleDepartments =
        employee?.subDepartments.map((dep) => dep.id.toString()) ??
        employee?.supervisor?.departments.map((d) => d.id.toString()) ??
        [];

      if (!requestedDepartmentId) {
        return accessibleDepartments;
      }

      if (!accessibleDepartments.includes(requestedDepartmentId)) {
        throw new ForbiddenException(
          'You do not have access to the requested department.',
        );
      }

      return [requestedDepartmentId];
    }
    return [];
  }
}
