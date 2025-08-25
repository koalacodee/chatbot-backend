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

  async execute({ id, guestId }: GetConversationInput) {
    const conversation = await this.conversationRepo.findById(id);

    if (!conversation) {
      throw new NotFoundException({ id: 'conversation_not_found' });
    }

    if (conversation.guest.id.value !== guestId) {
      throw new ForbiddenException('conversation_not_owned');
    }

    return conversation.toJSON();
  }
}
