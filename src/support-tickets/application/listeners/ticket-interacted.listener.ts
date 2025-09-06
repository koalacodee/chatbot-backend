import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogRepository } from 'src/activity-log/domain/repositories/activity-log.repository';
import { TicketInteractedEvent } from 'src/support-tickets/domain/events/ticket-interacted.event';

@Injectable()
export class TicketInteractedListener {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  @OnEvent(TicketInteractedEvent.name)
  async handleTicketInteractedEvent(
    event: TicketInteractedEvent,
  ): Promise<void> {
    const logs = await this.activityLogRepository.findByItemId(event.id);

    logs.forEach((log) => {
      log.meta = {
        ...log.meta,
        rating: event.rating,
      };
    });

    await this.activityLogRepository.saveMany(logs);
  }
}
