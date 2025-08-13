import { User } from 'src/shared/entities/user.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface ActivityLogOptions {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  user: User;
  activity: string;
  details: string;
  itemId: string;
}

export class ActivityLog {
  private readonly _id: UUID;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _user: User;
  private _activity: string;
  private _details: string;
  private _itemId: string;

  private constructor(options: ActivityLogOptions) {
    this._id = UUID.create(options.id);
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._user = options.user;
    this._activity = options.activity;
    this._details = options.details;
    this._itemId = options.itemId;
  }

  public static create(options: ActivityLogOptions): ActivityLog {
    return new ActivityLog(options);
  }

  public get id(): string {
    return this._id.value;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get user(): User {
    return this._user;
  }

  public get activity(): string {
    return this._activity;
  }

  public get details(): string {
    return this._details;
  }

  public get itemId(): string {
    return this._itemId;
  }

  public toJSON() {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      user: this.user.toJSON(),
      activity: this.activity,
      details: this.details,
      itemId: this.itemId,
    };
  }
}
