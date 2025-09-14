import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TicketAssignedTeamEvent } from 'src/support-tickets/domain/events/ticket-assigned-team.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TicketAssignedTeamListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TicketAssignedTeamEvent.name)
  async handleTicketAssignedTeamEvent(
    event: TicketAssignedTeamEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTicketAssignedTeamRecipients(
        event.assignedEmployeeId,
      );

    const notification = Notification.create({
      title: event.subject,
      type: 'ticket_assigned_team',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
