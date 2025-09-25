import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface AttachmentOptions {
  id?: string;
  type: string;
  filename: string;
  originalName: string;
  expirationDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  targetId: string;
}

export class Attachment {
  private readonly _id: UUID;
  private _type: string;
  private _filename: string;
  private _originalName: string;
  private _expirationDate: Date | null;
  private _createdAt: Date;
  private _updatedAt: Date;
  private readonly _targetId: UUID;

  private constructor(options: AttachmentOptions) {
    this._id = UUID.create(options.id);
    this._type = options.type;
    this._filename = options.filename;
    this._originalName = options.originalName;
    this._expirationDate = options.expirationDate ?? null;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
    if (!options.targetId) {
      throw new Error('Target ID is required');
    }
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

  get filename(): string {
    return this._filename;
  }

  set filename(value: string) {
    this._filename = value;
  }

  get originalName(): string {
    return this._originalName;
  }

  set originalName(value: string) {
    this._originalName = value;
  }

  get expirationDate(): Date | null {
    return this._expirationDate;
  }

  set expirationDate(value: Date | null) {
    this._expirationDate = value;
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
      filename: this._filename,
      originalName: this._originalName,
      expirationDate: this._expirationDate,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      targetId: this._targetId.value,
    };
  }
}
