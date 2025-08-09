import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';

interface GetConversationInput {
  id: string;
  userId?: string;
  guestId?: string;
}

@Injectable()
export class GetConversationUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute({ id, userId, guestId }: GetConversationInput) {
    const conversation = await this.conversationRepo.findById(id);

    if (!conversation) {
      throw new NotFoundException({ id: 'conversation_not_found' });
    }

    if (conversation.userId && conversation.userId.toString() !== userId) {
      throw new ForbiddenException('conversation_not_owned');
    }
    if (conversation.guestId && conversation.guestId.toString() !== guestId) {
      throw new ForbiddenException('conversation_not_owned');
    }

    return conversation.toJSON();
  }
}
