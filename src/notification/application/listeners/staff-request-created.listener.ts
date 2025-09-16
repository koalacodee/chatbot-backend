import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { StaffRequestCreatedEvent } from 'src/employee-request/domain/events/staff-request-created.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';
import { NotificationCreatedEvent } from 'src/notification/domain/events/notification-created.event';

@Injectable()
export class StaffRequestCreatedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(StaffRequestCreatedEvent.name)
  async handleStaffRequestCreatedEvent(
    event: StaffRequestCreatedEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveStaffRequestCreatedRecipients();

    const notification = Notification.create({
      title: event.newEmployeeUsername,
      type: 'staff_request_created',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);

    // Emit notification events
    notification.events.forEach((event) => {
      this.eventEmitter.emit(event.constructor.name, event);
    });
  }
}
