import { UUID } from 'src/shared/value-objects/uuid.vo';
import { NotificationRecipient } from './notification-recipient.entity';

interface NotificationOptions {
  id?: string;
  message: string;
  recipients?: NotificationRecipient[];
}

export class Notification {
  private readonly _id: string;
  private _message: string;
  private _recipients: NotificationRecipient[];

  private constructor(options: NotificationOptions) {
    this._id = options.id || UUID.create().toString();
    this._message = options.message;
    this._recipients = options.recipients ?? [];
  }

  public static create(options: NotificationOptions): Notification {
    return new Notification(options);
  }

  public get id(): string {
    return this._id;
  }

  public get message(): string {
    return this._message;
  }

  public set message(message: string) {
    this._message = message;
  }

  public get recipients(): NotificationRecipient[] {
    return this._recipients;
  }

  public set recipients(recipients: NotificationRecipient[]) {
    this._recipients = recipients;
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
      message: this._message,
    };
  }
}
