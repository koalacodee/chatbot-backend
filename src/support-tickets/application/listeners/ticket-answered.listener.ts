import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';

export enum InteractionType {
  INTERNAL_NOTE = 'INTERNAL_NOTE',
  PUBLIC_REPLY = 'PUBLIC_REPLY',
  RATING_REQUEST = 'RATING_REQUEST',
}

export class TicketAnsweredEvent {
  public constructor(
    public readonly title: string,
    public readonly id: string,
    public readonly answeredById: string,
    public readonly answeredAt: Date,
    public readonly rating?: InteractionType,
  ) {}
}

@Injectable()
export class TicketAnsweredListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(TicketAnsweredEvent.name)
  async handleTicketAnsweredEvent(event: TicketAnsweredEvent): Promise<void> {
    const activityLog = ActivityLog.create({
      type: ActivityLogType.TICKET_ANSWERED,
      title: event.title,
      itemId: event.id,
      userId: event.answeredById,
      meta: {
        rating: event.rating,
      },
      occurredAt: event.answeredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}
