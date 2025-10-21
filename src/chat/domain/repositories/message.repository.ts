import { Message } from '../entities/message.entity';
export abstract class MessageRepository {
  abstract save(chunk: Message): Promise<Message>;
  abstract createMany(messages: Message[]): Promise<Message[]>;
  abstract findById(id: string): Promise<Message | null>;
  abstract findAll(): Promise<Message[]>;
  abstract findByConversationId(conversationId: string): Promise<Message[]>;
  abstract removeById(id: string): Promise<Message | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
}
