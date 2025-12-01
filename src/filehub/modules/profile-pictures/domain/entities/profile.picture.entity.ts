import { UUID } from 'src/shared/value-objects/uuid.vo';

export type ProfilePictureFileType =
  // modern & safe
  'avif' | 'webp' | 'png' | 'jpeg' | 'jpg' | 'gif' | 'bmp';

export interface ProfilePictureProps {
  id: UUID;
  userId: UUID;
  filename: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfilePicture {
  private readonly _id: UUID;
  private _userId: UUID;
  private _filename: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ProfilePictureProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._filename = props.filename;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: ProfilePictureProps) {
    return new ProfilePicture(props);
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get userId(): UUID {
    return this._userId;
  }

  get filename(): string {
    return this._filename;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Setters
  set userId(userId: UUID) {
    this._userId = userId;
  }

  set filename(filename: string) {
    this._filename = filename;
  }

  set updatedAt(updatedAt: Date) {
    this._updatedAt = updatedAt;
  }

  // toJSON
  toJSON() {
    return {
      id: this._id.value,
      userId: this._userId.value,
      filename: this._filename,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
