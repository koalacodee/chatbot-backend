import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatbotService } from 'src/chat/domain/chatbot/chatbot-service.interface';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { Message } from 'src/chat/domain/entities/message.entity';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';
import { MessageRepository } from 'src/chat/domain/repositories/message.repository';
import { KnowledgeChunkRepository } from 'src/knowledge-chunks/domain/repositories/knowledge-chunk.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface AnswerFaqInput {
  id: string;
  userId?: string;
  guestId?: string;
  conversationId?: string;
}

@Injectable()
export class AnswerFaqUseCase {
  constructor(
    private readonly questionsRepo: QuestionRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly chatbot: ChatbotService,
    private readonly knowledgeChunk: KnowledgeChunkRepository,
  ) {}

  async execute({ id, userId, guestId, conversationId }: AnswerFaqInput) {
    if (!!guestId && !!userId) {
      guestId = undefined;
    }

    const question = await this.questionsRepo.findById(id);

    if (!question) {
      throw new NotFoundException({ id: 'question_not_found' });
    }

    const conversation = await this.ensureConversation({
      id: conversationId,
      type: guestId ? 'guest' : 'user',
      userOrGuestId: guestId ? guestId : userId,
    });

    if (question.answer) {
      const assistantMessage = await this.saveMessagesAndReturnAssistant(
        question.text,
        question.answer,
        conversation.id.toString(),
      );

      return {
        answer: assistantMessage.content,
        conversationId: assistantMessage.conversationId,
      };
    }

    if (question.knowledgeChunkId) {
      const knowledgeChunk = await this.knowledgeChunk.findById(
        question.knowledgeChunkId.toString(),
      );

      const answer = await this.chatbot.ask(
        [knowledgeChunk],
        question.text,
        conversation.retrievedChunks,
        conversation.messages,
      );
    }
  }

  private async ensureConversation({
    id,
    type,
    userOrGuestId,
  }: {
    id?: string;
    type: 'user' | 'guest';
    userOrGuestId: string;
  }) {
    if (id) {
      return this.conversationRepo.findById(id).then((c) => {
        if (!c) {
          throw new NotFoundException('conversation_not_found');
        }

        console.log(c);

        if (type === 'guest') {
          if (c.guestId.toString() !== userOrGuestId) {
            throw new ForbiddenException('conversation_not_owned');
          }
        } else {
          if (c.userId.toString() !== userOrGuestId) {
            throw new ForbiddenException('conversation_not_owned');
          }
        }

        return c;
      });
    }

    return this.conversationRepo.save(
      Conversation.create({
        userId: type === 'user' ? UUID.create(userOrGuestId) : undefined,
        guestId: type === 'guest' ? UUID.create(userOrGuestId) : undefined,
      }),
    );
  }

  private async saveMessagesAndReturnAssistant(
    question: string,
    answer: string,
    conversationId: string,
  ) {
    const now = new Date();
    const laterTime = new Date(now.getTime() + 2000); // 2 seconds later

    const [_, savedAssistantMessage] = await Promise.all([
      this.messageRepo.save(
        Message.create({
          role: 'USER',
          content: question,
          conversationId: conversationId,
          createdAt: now,
        }),
      ),
      this.messageRepo.save(
        Message.create({
          role: 'ASSISTANT',
          content: answer,
          conversationId: conversationId,
          createdAt: laterTime,
        }),
      ),
    ]);

    return savedAssistantMessage;
  }
}
