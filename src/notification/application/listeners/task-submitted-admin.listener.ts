import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskSubmittedAdminEvent } from 'src/task/domain/events/task-submitted-admin.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskSubmittedAdminListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TaskSubmittedAdminEvent.name)
  async handleTaskSubmittedAdminEvent(
    event: TaskSubmittedAdminEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskSubmittedAdminRecipients();

    const notification = Notification.create({
      title: event.title,
      type: 'task_submitted_admin',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
