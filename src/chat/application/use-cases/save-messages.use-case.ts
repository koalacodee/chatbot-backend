import { Injectable } from '@nestjs/common';
import { Message } from 'src/chat/domain/entities/message.entity';
import { RetrievedChunk } from 'src/chat/domain/entities/retrieved-chunk.entity';
import { MessageRepository } from 'src/chat/domain/repositories/message.repository';
import { RetrievedChunkRepository } from 'src/chat/domain/repositories/retrieved-chunk.repository';
import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';

@Injectable()
export class SaveMessagesUseCase {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly retrievedChunkRepo: RetrievedChunkRepository,
  ) {}

  async execute(
    question: string,
    answer: string,
    conversationId: string,
    currentChunks: KnowledgeChunk[],
  ) {
    const [_, savedAssistantMessage] = await Promise.all([
      this.messageRepo.save(
        Message.create({
          role: 'USER',
          content: question,
          conversationId,
        }),
      ),
      this.messageRepo.save(
        Message.create({
          role: 'ASSISTANT',
          content: answer,
          conversationId,
        }),
      ),
    ]);

    await Promise.all(
      currentChunks.map((chunk) =>
        this.retrievedChunkRepo.save(
          RetrievedChunk.create({
            messageId: savedAssistantMessage.id.value,
            knowledgeChunk: chunk,
            score: 1.0,
          }),
        ),
      ),
    );
  }
}
