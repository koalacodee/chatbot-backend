import { Notification } from '../entities/notification.entity';

export class NotificationCreatedEvent {
  constructor(public notification: Notification) {}
}
