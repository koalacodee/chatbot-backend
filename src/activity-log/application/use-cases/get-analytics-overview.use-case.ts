import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

@Injectable()
export class GetAnalyticsOverviewUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute() {
    return this.activityLogRepository.getAnalyticsOverview();
  }
}
