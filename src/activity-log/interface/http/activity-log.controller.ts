import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  AggregateActivityFeedUseCase,
  CalculateAgentPerformanceUseCase,
  PerformanceSummaryUseCase,
  SearchUsersUseCase,
} from '../../application/use-cases';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { GetAnalyticsOverviewUseCase } from 'src/activity-log/application/use-cases/get-analytics-overview.use-case';

@Controller('activity-log')
export class ActivityLogController {
  constructor(
    private readonly aggregateActivityFeedUseCase: AggregateActivityFeedUseCase,
    private readonly calculateAgentPerformanceUseCase: CalculateAgentPerformanceUseCase,
    private readonly performanceSummaryUseCase: PerformanceSummaryUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly getAnalyticsOverviewUseCase: GetAnalyticsOverviewUseCase,
  ) {}

  @SupervisorPermissions(SupervisorPermissionsEnum.VIEW_USER_ACTIVITY)
  @Get('feed')
  async getActivityFeed(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aggregateActivityFeedUseCase.execute({
      userId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @SupervisorPermissions()
  @Get('performance')
  async getAgentPerformance(@Query('userId') userId: string) {
    return this.calculateAgentPerformanceUseCase.execute({ userId });
  }

  @EmployeePermissions()
  @Get('performance-summary')
  async getPerformanceSummary(@Req() req: any) {
    return this.performanceSummaryUseCase.execute({ userId: req.user.id });
  }

  @AdminAuth()
  @Get('users/search')
  async searchUsers(@Query('q') searchQuery: string) {
    return this.searchUsersUseCase.execute({ searchQuery });
  }

  @AdminAuth()
  @Get('analytics-overview')
  async getAnalyticsOverview() {
    return this.getAnalyticsOverviewUseCase.execute();
  }
}
