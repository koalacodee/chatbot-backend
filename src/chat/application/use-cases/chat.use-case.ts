import { Injectable, NotFoundException } from '@nestjs/common';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { Message } from 'src/chat/domain/entities/message.entity';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';
import { MessageRepository } from 'src/chat/domain/repositories/message.repository';
import { LLMService } from 'src/chat/domain/services/llm.service';

interface ChatUseCaseInput {
  content: string;
  conversationId?: string;
  guestId?: string;
}

@Injectable()
export class ChatUseCase {
  constructor(
    private readonly llmService: LLMService,
    private readonly messagesRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
  ) {}

  async *execute({
    content,
    conversationId,
    guestId,
  }: ChatUseCaseInput): AsyncGenerator<string, string> {
    if (
      conversationId &&
      !(await this.conversationRepo.exists(conversationId))
    ) {
      console.log('Conversation Not Found');

      throw new NotFoundException({
        conversationId: 'conversation_not_found',
      });
    }

    if (!conversationId) {
      const newConversation = Conversation.create({
        anonymousId: guestId,
      });
      await this.conversationRepo.save(newConversation);
      conversationId = newConversation.id.value;
    }
    console.log('Conversation ID', conversationId);

    const messages = conversationId
      ? await this.messagesRepo.findByConversationId(conversationId)
      : [];

    const newMessage = Message.create({
      role: 'user',
      content,
      conversationId,
      createdAt: new Date(),
    });

    let finalResponse = '';

    await this.messagesRepo.save(newMessage);

    for await (const chunk of this.llmService.chatStream([
      ...messages,
      newMessage,
    ])) {
      yield chunk;
      finalResponse += chunk;
    }

    const assistantMessage = Message.create({
      role: 'assistant',
      content: finalResponse,
      conversationId,
      createdAt: new Date(),
    });

    await this.messagesRepo.save(assistantMessage);
    return conversationId;
  }
}
