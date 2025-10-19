import { UUID } from 'src/shared/value-objects/uuid.vo';
import { SupportedLanguage } from '../services/translation.service';

export class TranslationOptions {
  id?: string;
  lang: SupportedLanguage;
  content: string;
  targetId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Translation {
  private _id: UUID;
  private _lang: SupportedLanguage;
  private _content: string;
  private _targetId: UUID;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: TranslationOptions) {
    this._id = UUID.create(options.id);
    this._lang = options.lang;
    this._content = options.content;
    this._targetId = UUID.create(options.targetId);
    this._createdAt = options.createdAt ?? new Date();
    this._updatedAt = options.updatedAt ?? new Date();
  }

  static create(options: TranslationOptions): Translation {
    return new Translation(options);
  }

  // Getters and setters
  get id(): UUID {
    return this._id;
  }

  get lang(): SupportedLanguage {
    return this._lang;
  }
  set lang(value: SupportedLanguage) {
    this._lang = value;
  }

  get content(): string {
    return this._content;
  }
  set content(value: string) {
    this._content = value;
  }

  get targetId(): UUID {
    return this._targetId;
  }
  set targetId(value: UUID) {
    this._targetId = value;
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

  toJSON() {
    return {
      id: this._id.toString(),
      lang: this._lang,
      content: this._content,
      targetId: this._targetId.toString(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
