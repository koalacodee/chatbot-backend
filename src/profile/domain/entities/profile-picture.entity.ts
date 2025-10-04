import { UUID } from 'src/shared/value-objects/uuid.vo';

export interface ProfilePictureOptions {
  id?: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProfilePicture {
  private readonly _id: UUID;
  private readonly _userId: UUID;
  private _filename: string;
  private _originalName: string;
  private _mimeType: string;
  private _size: number;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: ProfilePictureOptions) {
    this._id = UUID.create(options.id);
    this._userId = UUID.create(options.userId);
    this._filename = options.filename;
    this._originalName = options.originalName;
    this._mimeType = options.mimeType;
    this._size = options.size;
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
  }

  static create(options: ProfilePictureOptions): ProfilePicture {
    return new ProfilePicture(options);
  }

  get id(): string {
    return this._id.value;
  }

  get userId(): string {
    return this._userId.value;
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

  get mimeType(): string {
    return this._mimeType;
  }

  set mimeType(value: string) {
    this._mimeType = value;
  }

  get size(): number {
    return this._size;
  }

  set size(value: number) {
    this._size = value;
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

  toJSON(): ProfilePictureOptions {
    return {
      id: this._id.value,
      userId: this._userId.value,
      filename: this._filename,
      originalName: this._originalName,
      mimeType: this._mimeType,
      size: this._size,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
