import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
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

interface AskUseCaseInput {
  question: string;
  conversationId?: string;
  userId?: string;
  guestId?: string;
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
    @InjectQueue('chat') private readonly queue: Queue,
  ) {}

  async execute({
    question,
    conversationId,
    userId,
    guestId,
  }: AskUseCaseInput) {
    if (!!userId && !!guestId) {
      guestId = undefined;
    }
    const [currentChunks, conversation] = await Promise.all([
      this.embeddingService
        .embed(question)
        .then((value) =>
          this.pointRepo.search(
            Vector.create({ vector: value, dim: value.length as 2048 }),
            3,
            0.65,
          ),
        )
        .then((points) =>
          this.chunkRepo.findByPointIds(points.map((p) => p.id.value)),
        ),
      this.ensureConversation({
        id: conversationId,
        type: userId ? 'user' : 'guest',
        userOrGuestId: userId ? userId : guestId,
      }),
    ]);

    if (currentChunks.length === 0) {
      const ticket = randomInt(1e7, 1e8);

      this.eventEmitter.emit('chatbot.unanswered', {
        question,
        userId,
        guestId,
        ticketCode: ticket,
      });

      return {
        message: 'ticket_created',
        ticket,
      };
    }

    const oldMessages = conversation.messages;
    const oldRetrievedChunks = conversation.retrievedChunks;

    // 3. Get the AI's answer
    const answer = await this.chatbotService.ask(
      currentChunks,
      question,
      oldRetrievedChunks,
      oldMessages,
    );

    await this.queue.add('save-message', {
      question,
      answer,
      conversationId: conversation.id.toString(),
      currentChunks,
    });

    // 5. Return the answer (and optionally the messages)
    return { answer, conversationId: conversation.id };
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
}
