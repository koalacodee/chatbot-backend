import { Injectable } from '@nestjs/common';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';

export interface GetAnalyticsSummaryResponseDto {
  kpis: { label: string; value: string }[];
  departmentPerformance: { name: string; score: number }[];
}

@Injectable()
export class GetAnalyticsSummaryUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(range: string = '7d'): Promise<GetAnalyticsSummaryResponseDto> {
    const match = /^([0-9]+)d$/.exec(range);
    const days = match ? parseInt(match[1], 10) : 7;
    return this.repo.getAnalyticsSummary(days);
  }
}
