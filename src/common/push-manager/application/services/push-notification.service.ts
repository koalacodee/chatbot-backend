import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';

import { PushManagerService } from './push-manager.service';
import { SendNotificationDto } from '../../interface/dto/send-notification.dto';
import { NotificationResult } from '../../domain/value-objects/notification-result.vo';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  constructor(private readonly pushManagerService: PushManagerService) {}

  async sendToUsers(
    userIds: string[],
    notification: SendNotificationDto,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const userId of userIds) {
      try {
        const subscriptions =
          await this.pushManagerService.getAllForUser(userId);

        if (subscriptions.length === 0) {
          results.push(
            NotificationResult.create({
              recipientId: userId,
              recipientType: 'user',
              success: false,
              error: 'No push subscriptions found for user',
            }),
          );
          continue;
        }

        const subscriptionResults = await this.sendToSubscriptions(
          subscriptions,
          notification,
        );

        results.push(
          NotificationResult.create({
            recipientId: userId,
            recipientType: 'user',
            success: subscriptionResults.some((r) => r.success),
            error: subscriptionResults.every((r) => !r.success)
              ? 'All subscriptions failed'
              : undefined,
            subscriptionResults,
          }),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${userId}:`,
          error,
        );
        results.push(
          NotificationResult.create({
            recipientId: userId,
            recipientType: 'user',
            success: false,
            error: error.message,
          }),
        );
      }
    }

    return results;
  }

  async sendToGuests(
    guestIds: string[],
    notification: SendNotificationDto,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const guestId of guestIds) {
      try {
        const subscriptions =
          await this.pushManagerService.getAllForUser(guestId);

        if (subscriptions.length === 0) {
          results.push(
            NotificationResult.create({
              recipientId: guestId,
              recipientType: 'guest',
              success: false,
              error: 'No push subscriptions found for guest',
            }),
          );
          continue;
        }

        const subscriptionResults = await this.sendToSubscriptions(
          subscriptions,
          notification,
        );

        results.push(
          NotificationResult.create({
            recipientId: guestId,
            recipientType: 'guest',
            success: subscriptionResults.some((r) => r.success),
            error: subscriptionResults.every((r) => !r.success)
              ? 'All subscriptions failed'
              : undefined,
            subscriptionResults,
          }),
        );
      } catch (error) {
        this.logger.error(
          `Failed to send notification to guest ${guestId}:`,
          error,
        );
        results.push(
          NotificationResult.create({
            recipientId: guestId,
            recipientType: 'guest',
            success: false,
            error: error.message,
          }),
        );
      }
    }

    return results;
  }

  async sendToMixedRecipients(
    userIds: string[],
    guestIds: string[],
    notification: SendNotificationDto,
  ): Promise<NotificationResult[]> {
    const userResults = await this.sendToUsers(userIds, notification);
    const guestResults = await this.sendToGuests(guestIds, notification);

    return [...userResults, ...guestResults];
  }

  private async sendToSubscriptions(
    subscriptions: any[],
    notification: SendNotificationDto,
  ): Promise<any[]> {
    const results = [];

    for (const subscription of subscriptions) {
      try {
        // Check if subscription is expired
        if (subscription.isExpired()) {
          results.push({
            subscriptionId: subscription.id.value,
            success: false,
            error: 'Subscription expired',
          });
          continue;
        }

        // Here you would integrate with a push notification service
        // For now, we'll simulate the sending
        const success = await this.sendPushNotification(
          subscription,
          notification,
        );

        results.push({
          subscriptionId: subscription.id.value,
          success,
          error: success ? undefined : 'Failed to send push notification',
        });
      } catch (error) {
        results.push({
          subscriptionId: subscription.id.value,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async sendPushNotification(
    subscription: any,
    notification: SendNotificationDto,
  ): Promise<boolean> {
    try {
      // Prepare the push subscription object for web-push
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      };

      // Prepare the payload
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        data: notification.data,
      });

      // Send notification using web-push
      await webPush.sendNotification(pushSubscription, payload);
      this.logger.log(
        `Notification sent via web-push to subscription ${subscription.id?.value || subscription.endpoint}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        'Failed to send push notification via web-push:',
        error,
      );
      return false;
    }
  }
}
