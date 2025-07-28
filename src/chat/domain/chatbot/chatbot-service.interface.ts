import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';
import { Message } from '../entities/message.entity';
import { RetrievedChunk } from '../entities/retrieved-chunk.entity';

export abstract class ChatbotService {
  abstract ask(
    knowledge: KnowledgeChunk[], // Current chunks (required)
    question: string, // Current question (required)
    pastChunks?: RetrievedChunk[], // Optional past chunks
    pastMessages?: Message[], // Optional past messages
  ): Promise<string> | string;
}
