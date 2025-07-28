import { Module } from '@nestjs/common';
import { KnowledgeChunkRepository } from './domain/repositories/knowledge-chunk.repository';
import { PrismaKnowledgeChunkRepository } from './infrastructure/repositories/prisma-knowledge-chunk.repository';
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
import { PointRepository } from './domain/repositories/point.repository';
import { QdrantPointRepository } from './infrastructure/repositories/qdrant-point.repository';
@Module({
  providers: [
    {
      provide: KnowledgeChunkRepository,
      useClass: PrismaKnowledgeChunkRepository,
    },
    {
      provide: PointRepository,
      useClass: QdrantPointRepository,
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
  exports: [EmbeddingService, PointRepository, KnowledgeChunkRepository],
})
export class KnowledgeChunkModule {}
