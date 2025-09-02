import { Module } from '@nestjs/common';
import { ActivityLogRepository } from './domain/repositories/activity-log.repository';
import { PrismaActivityLogRepository } from './infrastructure/repositories/prisma-activity-log.repository';
import { SearchUsersUseCase } from './application/use-cases/search-users.use-case';
import { SelectUserUseCase } from './application/use-cases/select-user.use-case';
import { PerformanceSummaryUseCase } from './application/use-cases/performance-summary.use-case';
import { ViewAnsweredTicketsUseCase } from './application/use-cases/view-answered-tickets.use-case';
import { ViewPerformedTasksUseCase } from './application/use-cases/view-performed-tasks.use-case';
import { ViewApprovedTasksUseCase } from './application/use-cases/view-approved-tasks.use-case';
import { ViewFaqContributionsUseCase } from './application/use-cases/view-faq-contributions.use-case';
import { ViewPromotionsCreatedUseCase } from './application/use-cases/view-promotions-created.use-case';
import { ViewStaffRequestsUseCase } from './application/use-cases/view-staff-requests.use-case';
import { AggregateActivityFeedUseCase } from './application/use-cases/aggregate-activity-feed.use-case';
import { ActivityLogController } from './interface/http/activity-log.controller';
import { CalculateAgentPerformanceUseCase } from './application/use-cases';

@Module({
  providers: [
    { provide: ActivityLogRepository, useClass: PrismaActivityLogRepository },
    SearchUsersUseCase,
    SelectUserUseCase,
    PerformanceSummaryUseCase,
    ViewAnsweredTicketsUseCase,
    ViewPerformedTasksUseCase,
    ViewApprovedTasksUseCase,
    ViewFaqContributionsUseCase,
    ViewPromotionsCreatedUseCase,
    ViewStaffRequestsUseCase,
    AggregateActivityFeedUseCase,
    CalculateAgentPerformanceUseCase,
  ],
  controllers: [ActivityLogController],
  exports: [ActivityLogRepository],
})
export class ActivityLogModule {}
