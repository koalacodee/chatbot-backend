import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export interface AggregateActivityFeedInputDto {
  userId?: string;
  limit?: number; // total items after merge
  page?: number;
  supervisorId?: string;
}

@Injectable()
export class AggregateActivityFeedUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute(input: AggregateActivityFeedInputDto) {
    return this.activityLogRepository.getAggregatedActivityFeed(input);
  }
}
