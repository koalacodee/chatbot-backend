import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface AttachmentOptions {
  id?: string;
  type: string;
  url: string;
  createdAt?: Date;
  updatedAt?: Date;
  targetId: string;
}

export class Attachment {
  private readonly _id: UUID;
  private _type: string;
  private _url: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private readonly _targetId: UUID;

  private constructor(options: AttachmentOptions) {
    this._id = UUID.create(options.id);
    this._type = options.type;
    this._url = options.url;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    this._targetId = UUID.create(options.targetId);
  }

  static create(options: AttachmentOptions): Attachment {
    return new Attachment(options);
  }

  get id(): string {
    return this._id.value;
  }

  get type(): string {
    return this._type;
  }

  set type(value: string) {
    this._type = value;
  }

  get url(): string {
    return this._url;
  }

  set url(value: string) {
    this._url = value;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  set createdAt(value: Date) {
    this._createdAt = value;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  get targetId(): string {
    return this._targetId.value;
  }

  toJSON(): AttachmentOptions {
    return {
      id: this._id.value,
      type: this._type,
      url: this._url,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      targetId: this._targetId.value,
    };
  }
}
