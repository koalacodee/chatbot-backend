import { UUID } from 'src/shared/value-objects/uuid.vo';

interface CreateMessageOptions {
  id?: string;
  conversationId?: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Message {
  private readonly _id: UUID;
  private _conversationId?: UUID;
  private _role: 'USER' | 'ASSISTANT';
  private _content: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(options: {
    id: UUID;
    conversationId?: UUID;
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this._id = options.id;
    this._conversationId = options.conversationId;
    this._role = options.role;
    this._content = options.content;
    this._createdAt = options.createdAt;
    this._updatedAt = options.updatedAt;
  }

  static create(options: CreateMessageOptions): Message {
    const now = new Date();
    return new Message({
      id: UUID.create(options.id),
      conversationId: options.conversationId
        ? UUID.create(options.conversationId)
        : undefined,
      role: options.role,
      content: options.content,
      createdAt: options.createdAt || now,
      updatedAt: options.updatedAt || now,
    });
  }

  // Getters
  get id(): UUID {
    return this._id;
  }

  get conversationId(): UUID | undefined {
    return this._conversationId;
  }

  get role(): 'USER' | 'ASSISTANT' {
    return this._role;
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

  // Setters
  set conversationId(newConversationId: UUID | undefined) {
    this._conversationId = newConversationId;
    this._updatedAt = new Date();
  }

  set content(newContent: string) {
    this._content = newContent;
    this._updatedAt = new Date();
  }

  // Utility methods
  toJSON() {
    return {
      id: this._id.value,
      conversationId: this._conversationId?.value,
      role: this._role,
      content: this._content,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  equals(other: Message): boolean {
    return this._id.value === other._id.value;
  }

  clone(): Message {
    return new Message({
      id: this._id,
      conversationId: this._conversationId,
      role: this._role,
      content: this._content,
      createdAt: new Date(this._createdAt),
      updatedAt: new Date(this._updatedAt),
    });
  }
}
