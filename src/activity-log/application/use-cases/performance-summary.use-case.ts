import { Injectable } from '@nestjs/common';
import {
  ActivityLogRepository,
  PerformanceSummary,
} from 'src/activity-log/domain/repositories/activity-log.repository';

export interface PerformanceSummaryInputDto {
  userId?: string;
}

export type PerformanceSummaryOutputDto = PerformanceSummary;

@Injectable()
export class PerformanceSummaryUseCase {
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async execute(
    input: PerformanceSummaryInputDto,
  ): Promise<PerformanceSummaryOutputDto> {
    return this.activityLogRepository.getPerformanceSummary(input.userId);
  }
}
