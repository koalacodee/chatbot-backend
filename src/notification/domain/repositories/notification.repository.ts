import { Notification } from '../entities/notification.entity';

export interface UnseenNotificationsResult {
  notifications: Notification[];
  counts: Record<string, number>;
}

export abstract class NotificationRepository {
  abstract save(notification: Notification): Promise<Notification>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findAll(): Promise<Notification[]>;
  abstract getUserNotifications(userId: string): Promise<Notification[]>;
  abstract deleteById(id: string): Promise<void>;
  abstract findUnseenNotifications(
    userId: string,
  ): Promise<UnseenNotificationsResult>;
  abstract markAllAsSeen(userId: string): Promise<void>;
  abstract markNotificationsAsSeen(
    userId: string,
    notificationIds: string[],
  ): Promise<void>;
}
