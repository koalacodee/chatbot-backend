import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationCreatedEvent } from 'src/notification/domain/events/notification-created.event';
import { NotificationEmailService } from '../services/notification-email.service';

@Injectable()
export class NotificationLoggingListener {
  private readonly logger = new Logger(NotificationLoggingListener.name);

  constructor(
    private readonly notificationEmailService: NotificationEmailService,
  ) {}

  @OnEvent(NotificationCreatedEvent.name)
  async handleNotificationCreatedEvent(
    event: NotificationCreatedEvent,
  ): Promise<void> {
    const notification = event.notification;

    this.logger.log(
      `Notification created: ${notification.type} - ${notification.title}`,
    );
    this.logger.debug(`Notification details:`, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      recipients: notification.recipients.map((r) => r.userId),
      createdAt: notification.createdAt,
    });

    // Send email notifications to all recipients
    try {
      await this.notificationEmailService.sendNotificationEmails(notification);
    } catch (error) {
      this.logger.error(`Failed to send notification emails`, {
        notificationId: notification.id,
        type: notification.type,
        error: error.message,
      });
    }
  }
}
