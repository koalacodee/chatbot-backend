import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRequestResolvedEvent } from 'src/employee-request/domain/events/staff-request-resolved.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';
import { NotificationCreatedEvent } from 'src/notification/domain/events/notification-created.event';

@Injectable()
export class StaffRequestResolvedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffRequestResolvedEvent.name)
  async handleStaffRequestResolvedEvent(
    event: StaffRequestResolvedEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveStaffRequestResolvedRecipients(
        event.requestedBySupervisorId,
      );

    const notification = Notification.create({
      title: event.newEmployeeUsername,
      type: 'staff_request_resolved',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);

    // Emit notification events
    notification.events.forEach((event) => {
      this.eventEmitter.emit(event.constructor.name, event);
    });
  }
}
