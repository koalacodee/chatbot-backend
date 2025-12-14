import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeChunkRepository } from './domain/repositories/knowledge-chunk.repository';
import { DrizzleKnowledgeChunkRepository } from './infrastructure/repositories/drizzle-knowledge-chunk.repository';
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
  GetKnowledgeChunksGroupedByDepartmentUseCase,
} from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
import { CreateKnowledgeChunksProcessor } from './infrastructure/queues/create-knowledge-chunks.processor';
import { KnowledgeChunkProcessingService } from './domain/services/knowledge-chunk-processing.service';
import { KnowledgeChunkProcessingServiceImpl } from './infrastructure/services/knowledge-chunk-processing.service.impl';
import { EmbeddingService } from './domain/services/embedding.service';
import { QwenEmbeddingService } from './infrastructure/services/qwen-embedding.service';
import { PointRepository } from './domain/repositories/point.repository';
import { QdrantPointRepository } from './infrastructure/repositories/qdrant-point.repository';
import { DepartmentKnowledgeEventListener } from './application/listeners/department-knowledge.listener';
@Module({
  providers: [
    {
      provide: KnowledgeChunkRepository,
      useClass: DrizzleKnowledgeChunkRepository,
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
    CreateKnowledgeChunksProcessor,
    SearchKnowledgeChunksUseCase,
    GetKnowledgeChunksGroupedByDepartmentUseCase,
    {
      provide: PointRepository,
      useClass: QdrantPointRepository,
    },
    DepartmentKnowledgeEventListener,
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
