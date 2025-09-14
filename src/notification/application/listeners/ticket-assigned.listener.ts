import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketAssignedEvent } from 'src/support-tickets/domain/events/ticket-assigned.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TicketAssignedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TicketAssignedEvent.name)
  async handleTicketAssignedEvent(event: TicketAssignedEvent): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTicketAssignedRecipients(
        event.assignedEmployeeId,
      );

    const notification = Notification.create({
      title: event.subject,
      type: 'ticket_assigned',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
