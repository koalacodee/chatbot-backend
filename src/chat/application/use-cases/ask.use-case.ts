import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
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
  private readonly logger = new Logger(AskUseCase.name);

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
    this.logger.log(
      `Starting execute with question: ${question}, conversationId: ${conversationId}, userId: ${userId}, guestId: ${guestId}, faqId: ${faqId}`,
    );

    if (userId && guestId) {
      this.logger.log(
        'Both userId and guestId provided, defaulting to userId only',
      );
      guestId = undefined;
    }
    if (!faqId && !question)
      throw new BadRequestException('Either faqId or question is required');

    const conversationExists = conversationId
      ? await this.conversationRepo.exists(conversationId)
      : null;
    this.logger.log(`Conversation exists check: ${conversationExists}`);

    if (faqId) {
      this.logger.log('Handling FAQ path');
      return this.handleFaqPath(
        faqId,
        conversationExists,
        conversationId,
        userId,
        guestId,
      );
    }

    this.logger.log('Handling normal question path');
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
    this.logger.log(`Starting FAQ path handling for faqId: ${faqId}`);

    const faq = await this.questionRepo.findById(faqId);
    if (!faq) {
      this.logger.warn(`FAQ not found for id: ${faqId}`);
      throw new NotFoundException({ question: 'FAQ_not_found' });
    }

    if (faq.answer) {
      this.logger.log('Direct FAQ answer found, returning immediately');
      return { answer: faq.answer, conversationId };
    }

    let chunks = [];

    if (faq.knowledgeChunkId) {
      this.logger.log(
        `Fetching linked knowledge chunk: ${faq.knowledgeChunkId}`,
      );
      const chunk = await this.chunkRepo.findById(
        faq.knowledgeChunkId.toString(),
      );
      if (chunk) {
        chunks = [chunk];
        this.logger.log('Using linked knowledge chunk');
      }
    }

    if (chunks.length === 0) {
      this.logger.log('No linked chunks found, performing semantic retrieval');
      chunks = await this.retrieveChunks(faq.text);
    }

    if (!conversationExists && chunks.length === 0) {
      this.logger.log('No relevant chunks found, creating support ticket');
      return this.createTicketAndReturn(faq.text, userId, guestId);
    }

    const conversation = await this.getOrCreateConversation(
      conversationId,
      userId,
      guestId,
    );
    this.logger.log(`Processing chat with conversation id: ${conversation.id}`);
    return this.processChat(conversation, chunks, faq.text);
  }

  private async handleNormalPath(
    question: string,
    conversationExists: boolean | null,
    conversationId?: string,
    userId?: string,
    guestId?: string,
  ) {
    this.logger.log('Starting normal question path handling');

    const chunks = await this.retrieveChunks(question);
    this.logger.log(`Retrieved ${chunks.length} relevant chunks`);

    if (!conversationExists && chunks.length === 0) {
      this.logger.log('No relevant chunks found, creating support ticket');
      return this.createTicketAndReturn(question, userId, guestId);
    }

    const conversation = await this.getOrCreateConversation(
      conversationId,
      userId,
      guestId,
    );
    this.logger.log(`Processing chat with conversation id: ${conversation.id}`);
    return this.processChat(conversation, chunks, question);
  }

  private async retrieveChunks(text: string) {
    this.logger.log('Starting chunk retrieval process');
    const vector = await this.embeddingService.embed(text);
    this.logger.log('Text embedding generated');

    const points = await this.pointRepo.search(
      Vector.create({ vector, dim: vector.length as 2048 }),
      3,
      0.65,
    );
    this.logger.log(`Found ${points.length} relevant points`);

    const chunks = await this.chunkRepo.findByPointIds(
      points.map((p) => p.id.value),
    );
    this.logger.log(`Retrieved ${chunks.length} knowledge chunks`);
    return chunks;
  }

  private createTicketAndReturn(
    question: string,
    userId?: string,
    guestId?: string,
  ) {
    const ticket = randomInt(1e7, 1e8);
    this.logger.log(`Creating support ticket with code: ${ticket}`);

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
    this.logger.log(`Processing chat for conversation: ${conversation.id}`);

    const answer = await this.chatbotService.ask(
      chunks,
      question,
      conversation.retrievedChunks,
      conversation.messages,
    );
    this.logger.log('Generated answer from chatbot service');

    await this.queue.add('save-message', {
      question,
      answer,
      conversationId: conversation.id.toString(),
      currentChunks: chunks,
    });
    this.logger.log('Added message to save queue');

    return { answer, conversationId: conversation.id };
  }

  private async getOrCreateConversation(
    conversationId: string | undefined,
    userId?: string,
    guestId?: string,
  ) {
    this.logger.log(
      `Getting or creating conversation for ${userId ? 'user' : 'guest'}`,
    );
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
    this.logger.log(`Ensuring conversation: ${id || 'new'} for ${type}`);

    if (id) {
      const c = await this.conversationRepo.findById(id);
      if (!c) {
        this.logger.warn(`Conversation not found: ${id}`);
        throw new NotFoundException('conversation_not_found');
      }

      if (type === 'guest' && c.guestId.toString() !== userOrGuestId) {
        this.logger.warn(
          `Unauthorized guest access attempt for conversation: ${id}`,
        );
        throw new ForbiddenException('conversation_not_owned');
      }
      if (type === 'user' && c.userId.toString() !== userOrGuestId) {
        this.logger.warn(
          `Unauthorized user access attempt for conversation: ${id}`,
        );
        throw new ForbiddenException('conversation_not_owned');
      }

      return c;
    }

    this.logger.log('Creating new conversation');
    return this.conversationRepo.save(
      Conversation.create({
        userId: type === 'user' ? UUID.create(userOrGuestId) : undefined,
        guestId: type === 'guest' ? UUID.create(userOrGuestId) : undefined,
      }),
    );
  }
}
