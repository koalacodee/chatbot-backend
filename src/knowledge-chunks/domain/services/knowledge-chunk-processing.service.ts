import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';

export interface ProcessKnowledgeChunkData {
  content: string;
  departmentId: string;
}

export abstract class KnowledgeChunkProcessingService {
  abstract processKnowledgeChunk(
    data: ProcessKnowledgeChunkData,
  ): Promise<KnowledgeChunk>;
}
