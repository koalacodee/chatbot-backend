import { Injectable } from '@nestjs/common';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';

interface GetAllConversationsInput {
  userId?: string;
  guestId?: string;
}

@Injectable()
export class GetAllConversationsUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute({ userId, guestId }: GetAllConversationsInput) {
    if (!!userId && !!guestId) {
      guestId = undefined;
    }

    return this.conversationRepo
      .findByGuestOrUser(userId, guestId)
      .then((conversations) =>
        conversations.map((conversation) => conversation.toJSON()),
      );
  }
}
