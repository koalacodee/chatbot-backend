import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCreatedEvent } from 'src/task/domain/events/task-created.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';
import { NotificationCreatedEvent } from 'src/notification/domain/events/notification-created.event';

@Injectable()
export class TaskCreatedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(TaskCreatedEvent.name)
  async handleTaskCreatedEvent(event: TaskCreatedEvent): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskCreatedRecipients(
        event.assignmentType,
        event.assignedEmployeeId,
        event.targetDepartmentId,
        event.targetSubDepartmentId,
      );

    console.log('recipients', recipients);

    const notification = Notification.create({
      title: event.title,
      type: 'task_created',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);

    // Emit notification events
    notification.events.forEach((event) => {
      this.eventEmitter.emit(event.constructor.name, event);
    });
  }
}
