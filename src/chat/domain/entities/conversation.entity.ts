import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Message } from './message.entity';
import { RetrievedChunk } from './retrieved-chunk.entity';

interface ConversationOptions {
  id?: UUID;
  userId: UUID;
  startedAt?: Date;
  endedAt?: Date;
  updatedAt?: Date;
  messages?: Message[];
  retrievedChunks?: RetrievedChunk[];
}

export class Conversation {
  private readonly _id: UUID;
  private _userId?: UUID;
  private _startedAt: Date;
  private _updatedAt: Date;
  private _endedAt?: Date;
  private _messages: Message[];
  private _retrievedChunks: RetrievedChunk[];
  private constructor(options: ConversationOptions) {
    this._id = options.id || UUID.create();
    this._userId = options.userId;
    this._startedAt = options.startedAt || new Date();
    this._endedAt = options.endedAt;
    this._updatedAt = options.updatedAt || new Date();
    this._messages = options.messages ?? [];
    this._retrievedChunks = options.retrievedChunks ?? [];
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get userId(): UUID | undefined {
    return this._userId;
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get endedAt(): Date | undefined {
    return this._endedAt;
  }

  get messages(): Message[] {
    return [...this._messages];
  }

  get retrievedChunks(): RetrievedChunk[] {
    return [...this._retrievedChunks];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Setters
  set userId(value: UUID | undefined) {
    this._userId = value;
  }

  set endedAt(value: Date | undefined) {
    this._endedAt = value;
  }

  set updatedAt(value: Date) {
    this._updatedAt = value;
  }

  set retrievedChunks(value: RetrievedChunk[]) {
    this._retrievedChunks = value;
  }

  // Utility methods
  addMessage(message: Message): void {
    this._messages.push(message);
  }

  isEnded(): boolean {
    return !!this._endedAt;
  }

  end(): void {
    if (!this.isEnded()) {
      this._endedAt = new Date();
    }
  }

  static create(options: ConversationOptions): Conversation {
    return new Conversation(options);
  }

  toJSON() {
    return {
      id: this._id.value,
      userId: this._userId?.value,
      startedAt: this._startedAt.toISOString(),
      endedAt: this._endedAt?.toISOString(),
      messages: this._messages.map((msg) => msg.toJSON()),
      retrievedChunks: this._retrievedChunks.map((chunk) => chunk.toJSON()),
    };
  }
}
