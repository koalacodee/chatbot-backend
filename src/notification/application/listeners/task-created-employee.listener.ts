import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCreatedEmployeeEvent } from 'src/task/domain/events/task-created-employee.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskCreatedEmployeeListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
  ) {}

  @OnEvent(TaskCreatedEmployeeEvent.name)
  async handleTaskCreatedEmployeeEvent(
    event: TaskCreatedEmployeeEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskCreatedEmployeeRecipients(
        event.assignedEmployeeId,
        event.assignedSubDepartmentId,
      );

    const notification = Notification.create({
      title: event.title,
      type: 'task_created_employee',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);
  }
}
