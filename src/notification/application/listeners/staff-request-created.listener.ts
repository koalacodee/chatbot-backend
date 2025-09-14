import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StaffRequestCreatedEvent } from 'src/employee-request/domain/events/staff-request-created.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class StaffRequestCreatedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
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
  }
}
