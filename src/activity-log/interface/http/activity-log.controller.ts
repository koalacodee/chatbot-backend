import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
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
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { RolesGuard, UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
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

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('performance/:userId')
  async getAgentPerformance() {
    return this.calculateAgentPerformanceUseCase.execute();
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('performance-summary')
  async getPerformanceSummary(@Req() req: any) {
    return this.performanceSummaryUseCase.execute({ userId: req.user.id });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('users/search')
  async searchUsers(@Query('q') searchQuery: string) {
    return this.searchUsersUseCase.execute({ searchQuery });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('users/:userId')
  async selectUser(@Query('userId') userId: string) {
    return this.selectUserUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('answered-tickets/:userId')
  async getAnsweredTickets(@Query('userId') userId: string) {
    return this.viewAnsweredTicketsUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('approved-tasks/:userId')
  async getApprovedTasks(@Query('userId') userId: string) {
    return this.viewApprovedTasksUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('faq-contributions/:userId')
  async getFaqContributions(@Query('userId') userId: string) {
    return this.viewFaqContributionsUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('performed-tasks/:userId')
  async getPerformedTasks(@Query('userId') userId: string) {
    return this.viewPerformedTasksUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('promotions-created/:userId')
  async getPromotionsCreated(@Query('userId') userId: string) {
    return this.viewPromotionsCreatedUseCase.execute({ userId });
  }

  @UseGuards(UserJwtAuthGuard, RolesGuard)
  @UseRoles(Roles.ADMIN, Roles.SUPERVISOR)
  @Get('staff-requests/:userId')
  async getStaffRequests(@Query('userId') userId: string) {
    return this.viewStaffRequestsUseCase.execute({ userId });
  }
}
