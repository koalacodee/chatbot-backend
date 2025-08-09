import { Conversation } from '../entities/conversation.entity';

export abstract class ConversationRepository {
  abstract save(chunk: Conversation): Promise<Conversation>;
  abstract findById(id: string): Promise<Conversation | null>;
  abstract findAll(): Promise<Conversation[]>;
  abstract removeById(id: string): Promise<Conversation | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
  abstract findByGuestOrUser(
    userId?: string,
    guestId?: string,
  ): Promise<Conversation[] | null>;
}
