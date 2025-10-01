import { Injectable } from '@nestjs/common';
import {
  DashboardRepository,
  PerformanceSeriesPoint,
} from '../../domain/repositories/dashboard.repository';

export interface GetWeeklyPerformanceResponseDto {
  series: PerformanceSeriesPoint[];
}

@Injectable()
export class GetWeeklyPerformanceUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(
    range: string = '7d',
  ): Promise<GetWeeklyPerformanceResponseDto> {
    const match = /^([0-9]+)d$/.exec(range);
    const days = match ? parseInt(match[1], 10) : 7;
    const series = await this.repo.getWeeklyPerformance(days);
    return { series };
  }
}
