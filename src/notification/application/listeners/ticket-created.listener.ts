import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketCreatedEvent } from 'src/support-tickets/domain/events/ticket-created.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TicketCreatedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TicketCreatedEvent.name)
  async handleTicketCreatedEvent(event: TicketCreatedEvent): Promise<void> {
    const recipients = await this.recipientResolver.resolveTicketCreatedRecipients(
      event.categoryId,
      event.subDepartmentId,
    );

    const notification = Notification.create({
      title: event.subject,
      type: 'ticket_created',
    });

    recipients.forEach(userId => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
