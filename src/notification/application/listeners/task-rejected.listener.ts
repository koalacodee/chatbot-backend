import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskRejectedEvent } from 'src/task/domain/events/task-rejected.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskRejectedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TaskRejectedEvent.name)
  async handleTaskRejectedEvent(event: TaskRejectedEvent): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskRejectedRecipients(
        event.assignedEmployeeId,
        event.performerEmployeeId,
      );

    const notification = Notification.create({
      title: event.title,
      type: 'task_rejected',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
