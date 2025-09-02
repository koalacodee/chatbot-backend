import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  AggregateActivityFeedUseCase,
  CalculateAgentPerformanceUseCase,
  PerformanceSummaryUseCase,
  SearchUsersUseCase,
  SelectUserUseCase,
  ViewAnsweredTicketsUseCase,
  ViewApprovedTasksUseCase,
  ViewFaqContributionsUseCase,
  ViewPerformedTasksUseCase,
  ViewPromotionsCreatedUseCase,
  ViewStaffRequestsUseCase,
} from '../../application/use-cases';
import { AdminAuth } from 'src/rbac/decorators/admin.decorator';
import {
  EmployeePermissions,
  SupervisorPermissions,
} from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

@Controller('activity-log')
export class ActivityLogController {
  constructor(
    private readonly aggregateActivityFeedUseCase: AggregateActivityFeedUseCase,
    private readonly calculateAgentPerformanceUseCase: CalculateAgentPerformanceUseCase,
    private readonly performanceSummaryUseCase: PerformanceSummaryUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly selectUserUseCase: SelectUserUseCase,
    private readonly viewAnsweredTicketsUseCase: ViewAnsweredTicketsUseCase,
    private readonly viewApprovedTasksUseCase: ViewApprovedTasksUseCase,
    private readonly viewFaqContributionsUseCase: ViewFaqContributionsUseCase,
    private readonly viewPerformedTasksUseCase: ViewPerformedTasksUseCase,
    private readonly viewPromotionsCreatedUseCase: ViewPromotionsCreatedUseCase,
    private readonly viewStaffRequestsUseCase: ViewStaffRequestsUseCase,
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
  @Get('performance/:userId')
  async getAgentPerformance() {
    return this.calculateAgentPerformanceUseCase.execute();
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

  @SupervisorPermissions()
  @Get('answered-tickets/:userId')
  async getAnsweredTickets(@Query('userId') userId: string) {
    return this.viewAnsweredTicketsUseCase.execute({ userId });
  }

  @SupervisorPermissions(SupervisorPermissionsEnum.MANAGE_SUPERVISORS)
  @Get('approved-tasks/:userId')
  async getApprovedTasks(@Query('userId') userId: string) {
    return this.viewApprovedTasksUseCase.execute({ userId });
  }

  @SupervisorPermissions()
  @Get('faq-contributions/:userId')
  async getFaqContributions(@Query('userId') userId: string) {
    return this.viewFaqContributionsUseCase.execute({ userId });
  }

  @SupervisorPermissions()
  @Get('performed-tasks/:userId')
  async getPerformedTasks(@Query('userId') userId: string) {
    return this.viewPerformedTasksUseCase.execute({ userId });
  }

  @AdminAuth()
  @Get('promotions-created/:userId')
  async getPromotionsCreated(@Query('userId') userId: string) {
    return this.viewPromotionsCreatedUseCase.execute({ userId });
  }

  @AdminAuth()
  @Get('staff-requests/:userId')
  async getStaffRequests(@Query('userId') userId: string) {
    return this.viewStaffRequestsUseCase.execute({ userId });
  }
}
