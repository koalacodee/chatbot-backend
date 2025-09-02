import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export enum AudienceType {
  ALL = 'ALL',
  DEPARTMENT = 'DEPARTMENT',
  SPECIFIC = 'SPECIFIC',
}

export class PromotionCreatedEvent {
  constructor(
    public readonly title: string,
    public readonly itemId: string,
    public readonly userId: string,
    public readonly occurredAt: Date,
    public readonly audience: AudienceType,
  ) {}
}

@Injectable()
export class PromotionCreatedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(PromotionCreatedEvent.name)
  async handlePromotionCreatedEvent(
    event: PromotionCreatedEvent,
  ): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.PROMOTION_CREATED,
      title: event.title,
      itemId: event.itemId,
      userId: event.userId,
      meta: {
        audience: event.audience,
      },
      occurredAt: event.occurredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}
