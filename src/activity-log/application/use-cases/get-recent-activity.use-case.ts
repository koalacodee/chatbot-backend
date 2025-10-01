import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from '../../domain/repositories/activity-log.repository';

export interface RecentActivityItemDto {
  id: string;
  type: 'ticket' | 'task' | 'faq' | 'user' | 'promotion';
  description: string;
  timestamp: string;
  meta: Record<string, any>;
}

export interface GetRecentActivityResponseDto {
  items: RecentActivityItemDto[];
}

@Injectable()
export class GetRecentActivityUseCase {
  constructor(private readonly repo: ActivityLogRepository) {}

  async execute(limit: number = 10): Promise<GetRecentActivityResponseDto> {
    const items = await this.repo.getRecentActivity(limit);
    return { items };
  }
}
