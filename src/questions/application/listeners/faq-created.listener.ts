import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export class FaqCreatedEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly createdById: string,
    public readonly createdAt: Date,
  ) {}
}

@Injectable()
export class FaqCreatedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(FaqCreatedEvent.name)
  async handleFaqCreatedEvent(event: FaqCreatedEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.FAQ_CREATED,
      title: event.title,
      itemId: event.id,
      userId: event.createdById,
      meta: {},
      occurredAt: event.createdAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}
