import { ForbiddenException, Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { EmployeeRequestRepository } from 'src/employee-request/domain/repositories/employee-request.repository';
import { SupervisorRepository } from 'src/supervisor/domain/repository/supervisor.repository';
import { EmployeeRepository } from 'src/employee/domain/repositories/employee.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Roles } from 'src/shared/value-objects/role.vo';

@Injectable()
export class GetDashboardOverviewUseCase {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly activityRepo: ActivityLogRepository,
    private readonly employeeReqRepo: EmployeeRequestRepository,
    private readonly supervisorRepository: SupervisorRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly departmentRepository: DepartmentRepository,
  ) { }

  async execute(
    range: string = '7d',
    limit: number = 10,
    userId?: string,
    departmentId?: string,
  ) {
    const match = /^([0-9]+)d$/.exec(range);
    const days = match ? parseInt(match[1], 10) : 7;

    // Get department IDs for filtering if user is supervisor or employee
    const departmentIds = await this.getUserDepartmentIds(userId, departmentId);

    const [
      summary,
      pendingTotal,
      pendingItems,
      recentActivityItems,
      performance,
      analyticsSummary,
      expiredAttachments,
    ] = await Promise.all([
      this.dashboardRepo.getSummary(departmentIds),
      this.employeeReqRepo.countPending(),
      this.employeeReqRepo.findPending(0, limit),
      this.activityRepo.getRecentActivity(limit),
      this.dashboardRepo.getWeeklyPerformance(days, departmentIds),
      this.dashboardRepo.getAnalyticsSummary(days, departmentIds),
      this.dashboardRepo.getExpiredAttachments(),
    ]);

    const pendingRequests = {
      total: pendingTotal,
      items: pendingItems.map((req) => ({
        id: req.id,
        candidateName: req.newEmployeeFullName ?? null,
        requestedBy: req.requestedBySupervisor?.user
          ? {
            id: req.requestedBySupervisor.user.id,
            name: req.requestedBySupervisor.user.name,
          }
          : null,
        createdAt: req.createdAt.toISOString(),
      })),
    };

    const recentActivity = { items: recentActivityItems };

    const performanceWrapped = { series: performance };

    return {
      summary,
      pendingRequests,
      recentActivity,
      performance: performanceWrapped,
      analyticsSummary,
      generatedAt: new Date().toISOString(),
      expiredAttachments,
    };
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
