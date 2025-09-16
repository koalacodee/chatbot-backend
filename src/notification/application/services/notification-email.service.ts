import { Injectable, Logger } from '@nestjs/common';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { Notification } from 'src/notification/domain/entities/notification.entity';
import {
  NotificationEmail,
  AppNotification,
} from 'src/shared/infrastructure/email/templates/NotificationEmail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly emailService: ResendEmailService,
    private readonly userRepository: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async sendNotificationEmails(notification: Notification): Promise<void> {
    const recipients = notification.recipients;

    if (recipients.length === 0) {
      this.logger.warn('No recipients found for notification', {
        notificationId: notification.id,
        type: notification.type,
      });
      return;
    }

    // Get user details for all recipients
    const userPromises = recipients.map((recipient) =>
      this.userRepository.findById(recipient.userId),
    );

    const users = await Promise.all(userPromises);
    const validUsers = users.filter((user) => user !== null);

    if (validUsers.length === 0) {
      this.logger.warn('No valid users found for notification recipients', {
        notificationId: notification.id,
        type: notification.type,
        recipientCount: recipients.length,
      });
      return;
    }

    // Prepare notification data for email template
    const appNotification: AppNotification = {
      id: notification.id,
      type: notification.type as any, // Type assertion since our template types match
      title: notification.title,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };

    // Send email to each user
    const emailPromises = validUsers.map(async (user) => {
      try {
        const subject = `Notification: ${notification.title}`;

        await this.emailService.sendReactEmail(
          user.email.toString(),
          subject,
          NotificationEmail,
          {
            notification: appNotification,
            dashboardUrl: this.config.get('DASHBOARD_URL'),
          },
        );

        this.logger.log(`Notification email sent to ${user.email}`, {
          notificationId: notification.id,
          userId: user.id,
          type: notification.type,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send notification email to ${user.email}`,
          {
            notificationId: notification.id,
            userId: user.id,
            type: notification.type,
            error: error.message,
          },
        );
        // Don't throw here to avoid stopping other emails
      }
    });

    await Promise.allSettled(emailPromises);

    this.logger.log(`Notification emails processed`, {
      notificationId: notification.id,
      type: notification.type,
      totalRecipients: recipients.length,
      validUsers: validUsers.length,
      emailsSent: validUsers.length,
    });
  }
}
