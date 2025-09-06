import { UUID } from 'src/shared/value-objects/uuid.vo';

interface NotificationRecipientOptions {
  id?: string;
  notificationId: string;
  userId: string;
  seen?: boolean;
}

export class NotificationRecipient {
  private readonly _id: UUID;
  private _notificationId: string;
  private _userId: string;
  private _seen: boolean;

  private constructor(options: NotificationRecipientOptions) {
    this._id = UUID.create(options.id);
    this._notificationId = options.notificationId;
    this._userId = options.userId;
    this._seen = options.seen ?? false;
  }

  public static create(
    options: NotificationRecipientOptions,
  ): NotificationRecipient {
    return new NotificationRecipient(options);
  }

  public get id(): UUID {
    return this._id;
  }

  public get notificationId(): string {
    return this._notificationId;
  }

  public set notificationId(notificationId: string) {
    this._notificationId = notificationId;
  }

  public get userId(): string {
    return this._userId;
  }

  public set userId(userId: string) {
    this._userId = userId;
  }

  public get seen(): boolean {
    return this._seen;
  }

  public set seen(seen: boolean) {
    this._seen = seen;
  }

  public toJSON(): NotificationRecipientOptions {
    return {
      id: this._id.toString(),
      notificationId: this._notificationId,
      userId: this._userId,
      seen: this._seen,
    };
  }
}
