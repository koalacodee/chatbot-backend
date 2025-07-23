import { Module } from '@nestjs/common';
import { KnowledgeChunkRepository } from './domain/repositories/knowledge-chunk.repository';
import { PrismaKnowledgeChunkRepository } from './infrastructure/repositories/prisma-knowledge-chunk.repository';
import { VectorsRepository } from './domain/repositories/vectors.repository';
import { QdrantVectorsRepository } from './infrastructure/repositories/qdrant-vectors.repository';
import { EmbeddingService } from './domain/embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from './infrastructure/ai/jina-ai.embedding-service';

@Module({
  providers: [
    {
      provide: KnowledgeChunkRepository,
      useClass: PrismaKnowledgeChunkRepository,
    },
    {
      provide: VectorsRepository,
      useClass: QdrantVectorsRepository,
    },
    {
      provide: EmbeddingService,
      useClass: JinaAiEmbeddingService,
    },
  ],
})
export class KnowledgeChunkModule {}
