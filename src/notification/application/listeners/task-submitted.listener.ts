import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { TaskSubmittedEvent } from 'src/task/domain/events/task-submitted.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';
import { NotificationCreatedEvent } from 'src/notification/domain/events/notification-created.event';

@Injectable()
export class TaskSubmittedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(TaskSubmittedEvent.name)
  async handleTaskSubmittedEvent(event: TaskSubmittedEvent): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskSubmittedRecipients(
        event.submissionType,
        event.assignedEmployeeId,
        event.supervisorId,
      );

    const notification = Notification.create({
      title: event.title,
      type: 'task_submitted',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);

    // Emit notification events
    notification.events.forEach((event) => {
      this.eventEmitter.emit(event.constructor.name, event);
    });
  }
}
