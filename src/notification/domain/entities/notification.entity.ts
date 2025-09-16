import { UUID } from 'src/shared/value-objects/uuid.vo';
import { NotificationRecipient } from './notification-recipient.entity';
import { NotificationCreatedEvent } from '../events/notification-created.event';

interface NotificationOptions {
  id?: string;
  title: string;
  type: string;
  recipients?: NotificationRecipient[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Notification {
  private readonly _id: string;
  private _type: string;
  private _recipients: NotificationRecipient[];
  private _title: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _events: Object[] = [];

  private constructor(options: NotificationOptions) {
    this._id = options.id || UUID.create().toString();
    this._type = options.type;
    this._title = options.title;
    this._recipients = options.recipients ?? [];
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
  }

  public static create(options: NotificationOptions): Notification {
    const notification = new Notification(options);
    notification._events.push(new NotificationCreatedEvent(notification));
    return notification;
  }

  public get id(): string {
    return this._id;
  }

  public get type(): string {
    return this._type;
  }

  public get events(): Object[] {
    return this._events;
  }

  public set type(type: string) {
    this._type = type;
  }

  public get recipients(): NotificationRecipient[] {
    return this._recipients;
  }

  public set recipients(recipients: NotificationRecipient[]) {
    this._recipients = recipients;
  }

  public get title(): string {
    return this._title;
  }

  public set title(title: string) {
    this._title = title;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public set createdAt(createdAt: Date) {
    this._createdAt = new Date(createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  public set updatedAt(updatedAt: Date) {
    this._updatedAt = new Date(updatedAt);
  }

  public addRecipient(userId: string) {
    this._recipients.push(
      NotificationRecipient.create({
        userId,
        notificationId: this._id,
        seen: false,
      }),
    );
  }

  public toJSON(): NotificationOptions {
    return {
      id: this._id,
      title: this._title,
      type: this._type,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
