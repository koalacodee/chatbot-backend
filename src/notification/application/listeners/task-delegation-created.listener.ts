import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { TaskDelegationCreatedEvent } from 'src/task/domain/events/task-delegation-created.event';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import { NotificationRepository } from 'src/notification/domain/repositories/notification.repository';
import { NotificationRecipientResolverService } from 'src/notification/domain/services/notification-recipient-resolver.service';

@Injectable()
export class TaskDelegationCreatedListener {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  @OnEvent(TaskDelegationCreatedEvent.name)
  async handleTaskDelegationCreatedEvent(
    event: TaskDelegationCreatedEvent,
  ): Promise<void> {
    const recipients =
      await this.recipientResolver.resolveTaskCreatedRecipients(
        event.assignmentType,
        event.assignedEmployeeId,
        undefined, // targetDepartmentId - delegations use sub-departments
        event.targetSubDepartmentId,
      );

    console.log('delegation recipients', recipients);

    const notification = Notification.create({
      title: event.title,
      type: 'task_delegation_created',
    });

    recipients.forEach((userId) => notification.addRecipient(userId));

    await this.notificationRepository.save(notification);

    // Emit notification events
    notification.events.forEach((event) => {
      this.eventEmitter.emit(event.constructor.name, event);
    });
  }
}

