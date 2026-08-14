import { Conversation } from '../domain/entities/conversation.entity';
import { Message } from '../domain/entities/message.entity';
import { RetrievedChunk } from '../domain/entities/retrieved-chunk.entity';
import { ConversationRepository } from '../domain/repositories/conversation.repository';
import { MessageRepository } from '../domain/repositories/message.repository';
import { RetrievedChunkRepository } from '../domain/repositories/retrieved-chunk.repository';

export class FakeConversationRepository extends ConversationRepository {
  readonly conversations = new Map<string, Conversation>();

  seed(...conversations: Conversation[]): this {
    for (const conversation of conversations) {
      this.conversations.set(conversation.id.value, conversation);
    }
    return this;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    this.conversations.set(conversation.id.value, conversation);
    return conversation;
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  async findAll(): Promise<Conversation[]> {
    return [...this.conversations.values()];
  }

  async removeById(id: string): Promise<Conversation | null> {
    const existing = this.conversations.get(id) ?? null;
    this.conversations.delete(id);
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    return this.conversations.has(id);
  }

  async count(): Promise<number> {
    return this.conversations.size;
  }

  /**
   * Mirrors the Drizzle implementation: a guest id filters to that guest, and an absent
   * one means "every conversation that has a guest at all" — which is how Prisma's
   * `{ guest: { id: undefined } }` collapsed.
   */
  async findByUser(userId?: string): Promise<Conversation[] | null> {
    const all = [...this.conversations.values()];

    return userId
      ? all.filter((conversation) => conversation.guest?.id.value === userId)
      : all.filter((conversation) => conversation.guest !== undefined);
  }
}

export class FakeMessageRepository extends MessageRepository {
  readonly messages = new Map<string, Message>();

  /** Every message handed to `save`, in call order. */
  readonly saved: Message[] = [];

  seed(...messages: Message[]): this {
    for (const message of messages) this.messages.set(message.id.value, message);
    return this;
  }

  async save(message: Message): Promise<Message> {
    this.saved.push(message);
    this.messages.set(message.id.value, message);
    return message;
  }

  async createMany(messages: Message[]): Promise<Message[]> {
    for (const message of messages) this.messages.set(message.id.value, message);
    return messages;
  }

  async findById(id: string): Promise<Message | null> {
    return this.messages.get(id) ?? null;
  }

  async findAll(): Promise<Message[]> {
    return [...this.messages.values()];
  }

  /** Ordered by createdAt ascending, as the real query is. */
  async findByConversationId(conversationId: string): Promise<Message[]> {
    return [...this.messages.values()]
      .filter((message) => message.conversationId?.value === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async removeById(id: string): Promise<Message | null> {
    const existing = this.messages.get(id) ?? null;
    this.messages.delete(id);
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    return this.messages.has(id);
  }

  async count(): Promise<number> {
    return this.messages.size;
  }
}

export class FakeRetrievedChunkRepository extends RetrievedChunkRepository {
  readonly chunks = new Map<string, RetrievedChunk>();

  /** Every chunk handed to `save`, in call order. */
  readonly saved: RetrievedChunk[] = [];

  async save(chunk: RetrievedChunk): Promise<RetrievedChunk> {
    this.saved.push(chunk);
    this.chunks.set(chunk.id, chunk);
    return chunk;
  }

  async findById(id: string): Promise<RetrievedChunk | null> {
    return this.chunks.get(id) ?? null;
  }

  async findAll(): Promise<RetrievedChunk[]> {
    return [...this.chunks.values()];
  }

  async removeById(id: string): Promise<RetrievedChunk | null> {
    const existing = this.chunks.get(id) ?? null;
    this.chunks.delete(id);
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    return this.chunks.has(id);
  }

  async count(): Promise<number> {
    return this.chunks.size;
  }
}
