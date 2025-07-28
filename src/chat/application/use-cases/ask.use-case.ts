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
import { Vector } from 'src/knowledge-chunks/domain/value-objects/vector.vo';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Conversation } from 'src/chat/domain/entities/conversation.entity';
import { UUID } from 'src/shared/value-objects/uuid.vo';

interface AskUseCaseInput {
  question: string;
  conversationId?: string;
  userId: string;
}

@Injectable()
export class AskUseCase {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepo: PointRepository,
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly chatbotService: ChatbotService,
    private readonly conversationRepo: ConversationRepository,
    @InjectQueue('chat') private readonly queue: Queue,
  ) {}

  async execute({ question, conversationId, userId }: AskUseCaseInput) {
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
          this.chunkRepo.findByIds(
            points.map((p) => p.knowledgeChunkId.toString()),
          ),
        ),
      conversationId
        ? this.conversationRepo.findById(conversationId).then((c) => {
            if (!c) {
              throw new NotFoundException('conversation_not_found');
            }

            if (c.userId.toString() !== userId) {
              throw new ForbiddenException('conversation_not_owned');
            }
            return c;
          })
        : this.conversationRepo.save(
            Conversation.create({ userId: UUID.create(userId) }),
          ),
    ]);

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
    return answer;
  }
}
