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
import { GuestRepository } from 'src/guest/domain/repositories/guest.repository';
import { KnowledgeChunkRepository } from 'src/knowledge-chunks/domain/repositories/knowledge-chunk.repository';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface AnswerFaqInput {
  id: string;
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
    private readonly guestRepo: GuestRepository,
  ) {}

  async execute({ id, guestId, conversationId }: AnswerFaqInput) {
    const question = await this.questionsRepo.findById(id);

    if (!question) {
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Question not found' }],
      });
    }

    const conversation = await this.ensureConversation({
      id: conversationId,
      guestId,
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
    guestId,
  }: {
    id?: string;
    guestId: string;
  }) {
    if (id) {
      return this.conversationRepo.findById(id).then((c) => {
        if (!c) {
          throw new NotFoundException({
            details: [
              { field: 'conversationId', message: 'Conversation not found' },
            ],
          });
        }

        if (c.guest.id.value !== guestId) {
          throw new ForbiddenException({
            details: [
              {
                field: 'conversationId',
                message: 'Conversation not owned by user',
              },
            ],
          });
        }

        return c;
      });
    }

    return this.conversationRepo.save(
      Conversation.create({
        guest: await this.guestRepo.findById(guestId),
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
