import { UUID } from 'src/shared/value-objects/uuid.vo';

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionOptions {
  id?: UUID;
  userId: string;
  endpoint: string;
  expirationTime?: Date | null;
  keys: PushSubscriptionKeys;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PushSubscription {
  private readonly _id: UUID;
  private _userId: string;
  private _endpoint: string;
  private _expirationTime: Date | null;
  private _keys: PushSubscriptionKeys;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: PushSubscriptionOptions) {
    this._id = options.id || UUID.create();
    this._userId = options.userId;
    this._endpoint = options.endpoint;
    this._expirationTime = options.expirationTime || null;
    this._keys = options.keys;
    this._createdAt = options.createdAt || new Date();
    this._updatedAt = options.updatedAt || new Date();
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get endpoint(): string {
    return this._endpoint;
  }

  get expirationTime(): Date | null {
    return this._expirationTime;
  }

  get keys(): PushSubscriptionKeys {
    return { ...this._keys };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Setters
  set userId(value: string) {
    this._userId = value;
    this._updatedAt = new Date();
  }

  set endpoint(value: string) {
    this._endpoint = value;
    this._updatedAt = new Date();
  }

  set expirationTime(value: Date | null) {
    this._expirationTime = value;
    this._updatedAt = new Date();
  }

  set keys(value: PushSubscriptionKeys) {
    this._keys = value;
    this._updatedAt = new Date();
  }

  // Utility methods
  isExpired(): boolean {
    if (!this._expirationTime) {
      return false;
    }
    return this._expirationTime < new Date();
  }

  static create(options: PushSubscriptionOptions): PushSubscription {
    return new PushSubscription(options);
  }

  toJSON() {
    return {
      id: this._id.value,
      userId: this._userId,
      endpoint: this._endpoint,
      expirationTime: this._expirationTime?.toISOString() || null,
      keys: this._keys,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
