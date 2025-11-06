import { Controller, Get, Query, Req } from '@nestjs/common';
import {
  GetDashboardSummaryUseCase,
  GetWeeklyPerformanceUseCase,
  GetAnalyticsSummaryUseCase,
  GetDashboardOverviewUseCase,
} from '../../application/use-cases';
import { DashboardSummaryResponseDto } from './dto';
import { FastifyRequest } from 'fastify';
import { SupervisorPermissions } from 'src/rbac/decorators';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getSummary: GetDashboardSummaryUseCase,
    private readonly getWeeklyPerformance: GetWeeklyPerformanceUseCase,
    private readonly getAnalyticsSummary: GetAnalyticsSummaryUseCase,
    private readonly getDashboardOverview: GetDashboardOverviewUseCase,
  ) { }

  @Get('summary')
  @SupervisorPermissions(SupervisorPermissionsEnum.VIEW_ANALYTICS)
  async summary(@Req() req: FastifyRequest & { user?: { id: string } }): Promise<DashboardSummaryResponseDto> {
    const userId = req.user?.id;
    return this.getSummary.execute(userId);
  }

  @Get('performance')
  @SupervisorPermissions(SupervisorPermissionsEnum.VIEW_ANALYTICS)
  async performance(
    @Query('range') range?: string,
    @Req() req?: FastifyRequest & { user?: { id: string } },
  ): Promise<{
    series: Array<{
      label: string;
      tasksCompleted: number;
      ticketsClosed: number;
      avgFirstResponseSeconds: number;
    }>;
  }> {
    const userId = req?.user?.id;
    return this.getWeeklyPerformance.execute(range ?? '7d', userId);
  }

  @Get('analytics-summary')
  @SupervisorPermissions(SupervisorPermissionsEnum.VIEW_ANALYTICS)
  async analyticsSummary(
    @Query('range') range?: string,
    @Req() req?: FastifyRequest & { user?: { id: string } },
  ): Promise<{
    kpis: { label: string; value: string }[];
    departmentPerformance: { name: string; score: number }[];
  }> {
    const userId = req?.user?.id;
    return this.getAnalyticsSummary.execute(range ?? '7d', userId);
  }

  @Get('overview')
  @SupervisorPermissions(SupervisorPermissionsEnum.VIEW_ANALYTICS)
  async overview(
    @Query('range') range?: string,
    @Query('limit') limit?: string,
    @Req() req?: FastifyRequest & { user?: { id: string } },
  ): Promise<any> {
    const userId = req?.user?.id;
    return this.getDashboardOverview.execute(
      range ?? '7d',
      limit ? parseInt(limit, 10) : 10,
      userId,
    );
  }
}
