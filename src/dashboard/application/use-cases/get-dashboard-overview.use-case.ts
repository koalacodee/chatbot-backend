import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { EmployeeRequestRepository } from 'src/employee-request/domain/repositories/employee-request.repository';

@Injectable()
export class GetDashboardOverviewUseCase {
  constructor(
    private readonly dashboardRepo: DashboardRepository,
    private readonly activityRepo: ActivityLogRepository,
    private readonly employeeReqRepo: EmployeeRequestRepository,
  ) {}

  async execute(range: string = '7d', limit: number = 10) {
    const match = /^([0-9]+)d$/.exec(range);
    const days = match ? parseInt(match[1], 10) : 7;

    const [
      summary,
      pendingTotal,
      pendingItems,
      recentActivityItems,
      performance,
      analyticsSummary,
    ] = await Promise.all([
      this.dashboardRepo.getSummary(),
      this.employeeReqRepo.countPending(),
      this.employeeReqRepo.findPending(0, limit),
      this.activityRepo.getRecentActivity(limit),
      this.dashboardRepo.getWeeklyPerformance(days),
      this.dashboardRepo.getAnalyticsSummary(days),
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
    };
  }
}
