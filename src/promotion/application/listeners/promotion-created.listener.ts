import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { PromotionCreatedEvent } from '../../domain/events/promotion-created.event';

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
