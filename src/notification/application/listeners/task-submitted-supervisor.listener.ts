import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskSubmittedSupervisorEvent } from 'src/task/domain/events/task-submitted-supervisor.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskSubmittedSupervisorListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TaskSubmittedSupervisorEvent.name)
  async handleTaskSubmittedSupervisorEvent(
    event: TaskSubmittedSupervisorEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskSubmittedSupervisorRecipients(
        event.assignedEmployeeId,
      );

    const notification = Notification.create({
      title: event.title,
      type: 'task_submitted_supervisor',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
