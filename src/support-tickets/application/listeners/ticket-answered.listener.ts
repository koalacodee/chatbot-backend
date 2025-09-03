import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogType } from 'src/activity-log/domain/entities/activity-log.entity';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { TicketAnsweredEvent } from 'src/support-tickets/domain/events/ticket-answered.event';

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
        code: event.code,
      },
      occurredAt: event.answeredAt,
    });

    await this.activityLogRepository.save(activityLog);
  }
}
