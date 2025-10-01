import { Controller, Get, Query } from '@nestjs/common';
import {
  GetDashboardSummaryUseCase,
  GetWeeklyPerformanceUseCase,
  GetAnalyticsSummaryUseCase,
  GetDashboardOverviewUseCase,
} from '../../application/use-cases';
import { DashboardSummaryResponseDto } from './dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getSummary: GetDashboardSummaryUseCase,
    private readonly getWeeklyPerformance: GetWeeklyPerformanceUseCase,
    private readonly getAnalyticsSummary: GetAnalyticsSummaryUseCase,
    private readonly getDashboardOverview: GetDashboardOverviewUseCase,
  ) {}

  @Get('summary')
  async summary(): Promise<DashboardSummaryResponseDto> {
    return this.getSummary.execute();
  }

  @Get('performance')
  async performance(@Query('range') range?: string): Promise<{
    series: Array<{
      label: string;
      tasksCompleted: number;
      ticketsClosed: number;
      avgFirstResponseSeconds: number;
    }>;
  }> {
    return this.getWeeklyPerformance.execute(range ?? '7d');
  }

  @Get('analytics-summary')
  async analyticsSummary(@Query('range') range?: string): Promise<{
    kpis: { label: string; value: string }[];
    departmentPerformance: { name: string; score: number }[];
  }> {
    return this.getAnalyticsSummary.execute(range ?? '7d');
  }

  @Get('overview')
  async overview(
    @Query('range') range?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.getDashboardOverview.execute(
      range ?? '7d',
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
