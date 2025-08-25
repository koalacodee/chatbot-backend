import { Injectable } from '@nestjs/common';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';

interface GetAllConversationsInput {
  guestId?: string;
}

@Injectable()
export class GetAllConversationsUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute({ guestId }: GetAllConversationsInput) {
    return this.conversationRepo
      .findByUser(guestId)
      .then((conversations) =>
        conversations.map((conversation) => conversation.toJSON()),
      );
  }
}
