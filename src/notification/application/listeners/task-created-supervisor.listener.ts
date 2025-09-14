import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCreatedSupervisorEvent } from 'src/task/domain/events/task-created-supervisor.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskCreatedSupervisorListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TaskCreatedSupervisorEvent.name)
  async handleTaskCreatedSupervisorEvent(
    event: TaskCreatedSupervisorEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskCreatedSupervisorRecipients(
        event.categoryId,
      );

    const notification = Notification.create({
      title: event.title,
      type: 'task_created_supervisor',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
