import { UUID } from '../value-objects/uuid.vo';

export interface AttachmentOptions {
  id?: string;
  name: string;
  type: string;
  dataUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
  targetId: string;
}

export class Attachment {
  private readonly _id: UUID;
  private _name: string;
  private _type: string;
  private _dataUrl: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private readonly _targetId: UUID;

  private constructor(options: AttachmentOptions) {
    this._id = UUID.create(options.id);
    this._name = options.name;
    this._type = options.type;
    this._dataUrl = options.dataUrl;
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

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get type(): string {
    return this._type;
  }

  set type(value: string) {
    this._type = value;
  }

  get dataUrl(): string {
    return this._dataUrl;
  }

  set dataUrl(value: string) {
    this._dataUrl = value;
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
      name: this._name,
      type: this._type,
      dataUrl: this._dataUrl,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      targetId: this._targetId.value,
    };
  }
}
