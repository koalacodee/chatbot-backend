import { Module } from '@nestjs/common';
import { KnowledgeChunkRepository } from './domain/repositories/knowledge-chunk.repository';
import { PrismaKnowledgeChunkRepository } from './infrastructure/repositories/prisma-knowledge-chunk.repository';
import { VectorsRepository } from './domain/repositories/vectors.repository';
import { QdrantVectorsRepository } from './infrastructure/repositories/qdrant-vectors.repository';
import { EmbeddingService } from './domain/embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from './infrastructure/ai/jina-ai.embedding-service';
import { KnowledgeChunkController } from './interface/http/knowledge-chunk.controller';
import {
  CountKnowledgeChunksUseCase,
  CreateKnowledgeChunkUseCase,
  DeleteKnowledgeChunkUseCase,
  DeleteManyKnowledgeChunksUseCase,
  FindKnowledgeChunksByDepartmentUseCase,
  GetAllKnowledgeChunksUseCase,
  GetKnowledgeChunkUseCase,
  UpdateKnowledgeChunkUseCase,
} from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
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
    CountKnowledgeChunksUseCase,
    CreateKnowledgeChunkUseCase,
    DeleteKnowledgeChunkUseCase,
    DeleteManyKnowledgeChunksUseCase,
    FindKnowledgeChunksByDepartmentUseCase,
    GetAllKnowledgeChunksUseCase,
    GetKnowledgeChunkUseCase,
    UpdateKnowledgeChunkUseCase,
  ],
  controllers: [KnowledgeChunkController],
  imports: [DepartmentModule],
})
export class KnowledgeChunkModule {}
