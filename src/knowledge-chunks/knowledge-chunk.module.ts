import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeChunkRepository } from './domain/repositories/knowledge-chunk.repository';
import { PrismaKnowledgeChunkRepository } from './infrastructure/repositories/prisma-knowledge-chunk.repository';
import { KnowledgeChunkController } from './interface/http/knowledge-chunk.controller';
import {
  CountKnowledgeChunksUseCase,
  CreateKnowledgeChunkUseCase,
  DeleteKnowledgeChunkUseCase,
  DeleteManyKnowledgeChunksUseCase,
  FindKnowledgeChunksByDepartmentUseCase,
  GetAllKnowledgeChunksUseCase,
  GetKnowledgeChunkUseCase,
  SearchKnowledgeChunksUseCase,
  UpdateKnowledgeChunkUseCase,
} from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
import { CreateKnowledgeChunksProcessor } from './infrastructure/queues/create-knowledge-chunks.processor';
import { KnowledgeChunkProcessingService } from './domain/services/knowledge-chunk-processing.service';
import { KnowledgeChunkProcessingServiceImpl } from './infrastructure/services/knowledge-chunk-processing.service.impl';
import { EmbeddingService } from './domain/services/embedding.service';
import { QwenEmbeddingService } from './infrastructure/services/qwen-embedding.service';
import { PointRepository } from './domain/repositories/point.repository';
import { QdrantPointRepository } from './infrastructure/repositories/qdrant-point.repository';
@Module({
  providers: [
    {
      provide: KnowledgeChunkRepository,
      useClass: PrismaKnowledgeChunkRepository,
    },
    {
      provide: KnowledgeChunkProcessingService,
      useClass: KnowledgeChunkProcessingServiceImpl,
    },
    {
      provide: EmbeddingService,
      useClass: QwenEmbeddingService,
    },
    CountKnowledgeChunksUseCase,
    CreateKnowledgeChunkUseCase,
    DeleteKnowledgeChunkUseCase,
    DeleteManyKnowledgeChunksUseCase,
    FindKnowledgeChunksByDepartmentUseCase,
    GetAllKnowledgeChunksUseCase,
    GetKnowledgeChunkUseCase,
    UpdateKnowledgeChunkUseCase,
    CreateKnowledgeChunksProcessor,
    SearchKnowledgeChunksUseCase,
    {
      provide: PointRepository,
      useClass: QdrantPointRepository,
    },
  ],
  controllers: [KnowledgeChunkController],
  imports: [
    DepartmentModule,
    BullModule.registerQueue({
      name: 'knowledge-chunks',
    }),
  ],
  exports: [KnowledgeChunkRepository, SearchKnowledgeChunksUseCase],
})
export class KnowledgeChunkModule {}
