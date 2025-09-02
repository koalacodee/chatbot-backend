import { UUID } from 'src/shared/value-objects/uuid.vo';

export enum ActivityLogType {
  TICKET_ANSWERED = 'TICKET_ANSWERED',
  TASK_PERFORMED = 'TASK_PERFORMED',
  TASK_APPROVED = 'TASK_APPROVED',
  FAQ_CREATED = 'FAQ_CREATED',
  FAQ_UPDATED = 'FAQ_UPDATED',
  PROMOTION_CREATED = 'PROMOTION_CREATED',
  STAFF_REQUEST_CREATED = 'STAFF_REQUEST_CREATED',
}

export interface ActivityLogOptions {
  id?: string;
  type: ActivityLogType;
  title: string;
  itemId: string;
  meta: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  userId: string;
  occurredAt: Date;
}

export class ActivityLog {
  private readonly _id: UUID;
  private _type: ActivityLogType;
  private _title: string;
  private _itemId: string;
  private _meta: Record<string, any>;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _userId: string;
  private _occurredAt: Date;

  constructor(options: ActivityLogOptions) {
    this._id = UUID.create(options.id);
    this._type = options.type;
    this._title = options.title;
    this._itemId = options.itemId;
    this._meta = options.meta;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
    this._userId = options.userId;
    this._occurredAt = options.occurredAt;
  }

  public static create(options: ActivityLogOptions): ActivityLog {
    return new ActivityLog(options);
  }

  public get id(): string {
    return this._id.value;
  }

  public get type(): ActivityLogType {
    return this._type;
  }

  public get title(): string {
    return this._title;
  }

  public get itemId(): string {
    return this._itemId;
  }

  public get meta(): Record<string, any> {
    return this._meta;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get userId(): string {
    return this._userId;
  }

  public get occurredAt(): Date {
    return this._occurredAt;
  }

  public toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      itemId: this.itemId,
      meta: this.meta,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      userId: this.userId,
      occurredAt: this.occurredAt.toISOString(),
    };
  }
}
