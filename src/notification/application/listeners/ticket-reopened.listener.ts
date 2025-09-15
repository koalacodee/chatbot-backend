import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketReopenedEvent } from 'src/support-tickets/domain/events/ticket-reopened.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TicketReopenedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TicketReopenedEvent.name)
  async handleTicketReopenedEvent(event: TicketReopenedEvent): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTicketReopenedRecipients(
        event.answeredByUserId,
        event.departmentId,
        event.subDepartmentId,
      );

    const notification = Notification.create({
      title: event.subject,
      type: 'ticket_reopened',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
