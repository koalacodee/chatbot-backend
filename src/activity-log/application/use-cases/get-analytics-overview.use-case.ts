import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

interface GetAnalyticsOverviewInput {
  supervisorId?: string;
}

@Injectable()
export class GetAnalyticsOverviewUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute(input: GetAnalyticsOverviewInput) {
    return this.activityLogRepository.getAnalyticsOverview(input?.supervisorId);
  }
}
