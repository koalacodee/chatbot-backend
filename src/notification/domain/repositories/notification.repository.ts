import { Notification } from '../entities/notification.entity';

export abstract class NotificationRepository {
  abstract save(notification: Notification): Promise<Notification>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findAll(): Promise<Notification[]>;
  abstract getUserNotifications(userId: string): Promise<Notification[]>;
  abstract deleteById(id: string): Promise<void>;
  abstract findUnseenNotifications(userId: string): Promise<Notification[]>;
  abstract markAllAsSeen(userId: string): Promise<void>;
}
