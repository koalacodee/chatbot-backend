import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export class FaqUpdatedEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly updatedById: string,
    public readonly updatedAt: Date,
  ) {}
}

@Injectable()
export class FaqUpdatedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(FaqUpdatedEvent.name)
  async handleFaqUpdatedEvent(event: FaqUpdatedEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.FAQ_UPDATED,
      title: event.title,
      itemId: event.id,
      userId: event.updatedById,
      occurredAt: event.updatedAt,
      meta: {},
    });

    await this.activityLogRepository.save(activityLog);
  }
}
