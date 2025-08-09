import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmbeddingService } from 'src/shared/embedding/embedding-service.interface';
import { PointRepository } from 'src/shared/repositories/point.repository';
import { KnowledgeChunkRepository } from 'src/knowledge-chunks/domain/repositories/knowledge-chunk.repository';
import { ChatbotService } from 'src/chat/domain/chatbot/chatbot-service.interface';
import { ConversationRepository } from 'src/chat/domain/repositories/conversation.repository';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomInt } from 'crypto';
import { QuestionRepository } from 'src/questions/domain/repositories/question.repository';

interface AskUseCaseInput {
  question: string;
  conversationId?: string;
  userId?: string;
  guestId?: string;
  faqId?: string;
}

@Injectable()
export class AskUseCase {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepo: PointRepository,
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly chatbotService: ChatbotService,
    private readonly conversationRepo: ConversationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly questionRepo: QuestionRepository,
    @InjectQueue('chat') private readonly queue: Queue,
  ) {}

  async execute({
    question,
    conversationId,
    userId,
    guestId,
    faqId,
  }: AskUseCaseInput) {
    if (userId && guestId) guestId = undefined;
    if (!faqId && !question)
      throw new BadRequestException('Either faqId or question is required');

    const conversationExists = conversationId
      ? await this.conversationRepo.exists(conversationId)
      : null;

    if (faqId) {
      return this.handleFaqPath(
        faqId,
        conversationExists,
        conversationId,
        userId,
        guestId,
      );
    }

    return this.handleNormalPath(
      question,
      conversationExists,
      conversationId,
      userId,
      guestId,
    );
  }

  private async handleFaqPath(
    faqId: string,
    conversationExists: boolean | null,
    conversationId?: string,
    userId?: string,
    guestId?: string,
  ) {
    const faq = await this.questionRepo.findById(faqId);
    if (!faq) throw new NotFoundException({ question: 'FAQ_not_found' });

    // If FAQ has a direct text answer, return it immediately
    if (faq.answer) {
      return { answer: faq.answer, conversationId };
    }

    let chunks = [];

    // If FAQ is linked to a specific chunk, use it and call the chatbot
    if (faq.knowledgeChunkId) {
      const chunk = await this.chunkRepo.findById(
        faq.knowledgeChunkId.toString(),
      );
      if (chunk) {
        chunks = [chunk];
      }
    }

    // If no linked chunk, do semantic retrieval
    if (chunks.length === 0) {
      chunks = await this.retrieveChunks(faq.text);
    }

    // Ticket creation if no chunks found
    if (!conversationExists && chunks.length === 0) {
      return this.createTicketAndReturn(faq.text, userId, guestId);
    }

    const conversation = await this.getOrCreateConversation(
      conversationId,
      userId,
      guestId,
    );
    return this.processChat(conversation, chunks, faq.text);
  }

  private async handleNormalPath(
    question: string,
    conversationExists: boolean | null,
    conversationId?: string,
    userId?: string,
    guestId?: string,
  ) {
    const chunks = await this.retrieveChunks(question);
    if (!conversationExists && chunks.length === 0) {
      return this.createTicketAndReturn(question, userId, guestId);
    }

    const conversation = await this.getOrCreateConversation(
      conversationId,
      userId,
      guestId,
    );
    return this.processChat(conversation, chunks, question);
  }

  private async retrieveChunks(text: string) {
    const vector = await this.embeddingService.embed(text);
    const points = await this.pointRepo.search(
      Vector.create({ vector, dim: vector.length as 2048 }),
      3,
      0.65,
    );
    return this.chunkRepo.findByPointIds(points.map((p) => p.id.value));
  }

  private createTicketAndReturn(
    question: string,
    userId?: string,
    guestId?: string,
  ) {
    const ticket = randomInt(1e7, 1e8);
    this.eventEmitter.emit('chatbot.unanswered', {
      question,
      userId,
      guestId,
      ticketCode: ticket,
    });
    return { message: 'ticket_created', ticket };
  }

  private async processChat(
    conversation: Conversation,
    chunks: any[],
    question: string,
  ) {
    const answer = await this.chatbotService.ask(
      chunks,
      question,
      conversation.retrievedChunks,
      conversation.messages,
    );

    await this.queue.add('save-message', {
      question,
      answer,
      conversationId: conversation.id.toString(),
      currentChunks: chunks,
    });

    return { answer, conversationId: conversation.id };
  }

  private async getOrCreateConversation(
    conversationId: string | undefined,
    userId?: string,
    guestId?: string,
  ) {
    return this.ensureConversation({
      id: conversationId,
      type: userId ? 'user' : 'guest',
      userOrGuestId: userId ?? guestId,
    });
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
      const c = await this.conversationRepo.findById(id);
      if (!c) throw new NotFoundException('conversation_not_found');

      if (type === 'guest' && c.guestId.toString() !== userOrGuestId) {
        throw new ForbiddenException('conversation_not_owned');
      }
      if (type === 'user' && c.userId.toString() !== userOrGuestId) {
        throw new ForbiddenException('conversation_not_owned');
      }

      return c;
    }

    return this.conversationRepo.save(
      Conversation.create({
        userId: type === 'user' ? UUID.create(userOrGuestId) : undefined,
        guestId: type === 'guest' ? UUID.create(userOrGuestId) : undefined,
      }),
    );
  }
}
