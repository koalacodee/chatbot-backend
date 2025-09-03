import { Injectable } from '@nestjs/common';
import { UserPerformanceArgs } from 'src/activity-log/domain/repositories/activity-log.repository';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

@Injectable()
export class CalculateAgentPerformanceUseCase {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async execute(input: UserPerformanceArgs) {
    return this.activityLogRepository.getAgentPerformance(input);
  }
}
