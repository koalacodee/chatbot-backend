import { UUID } from 'src/shared/value-objects/uuid.vo';

interface CreateAnswerOptions {
  ticketId: string;
  content: string;
}

export class Answer {
  private _id: UUID;
  private _ticketId: UUID;
  private _content: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: UUID,
    ticketId: UUID,
    content: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._ticketId = ticketId;
    this._content = content;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(options: CreateAnswerOptions): Answer {
    const now = new Date();
    return new Answer(
      UUID.create(),
      UUID.create(options.ticketId),
      options.content,
      now,
      now,
    );
  }

  static fromPersistence(data: {
    id: string;
    ticketId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }): Answer {
    return new Answer(
      UUID.create(data.id),
      UUID.create(data.ticketId),
      data.content,
      data.createdAt,
      data.updatedAt,
    );
  }

  get id(): UUID {
    return this._id;
  }

  get ticketId(): UUID {
    return this._ticketId;
  }

  get content(): string {
    return this._content;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateContent(content: string): void {
    this._content = content;
    this._updatedAt = new Date();
  }

  toPersistence() {
    return {
      id: this._id.toString(),
      ticketId: this._ticketId.toString(),
      content: this._content,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}