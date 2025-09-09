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
  UpdateKnowledgeChunkUseCase,
} from './application/use-cases';
import { DepartmentModule } from 'src/department/department.module';
import { CreateKnowledgeChunksProcessor } from './infrastructure/queues/create-knowledge-chunks.processor';
import { KnowledgeChunkProcessingService } from './domain/services/knowledge-chunk-processing.service';
import { KnowledgeChunkProcessingServiceImpl } from './infrastructure/services/knowledge-chunk-processing.service.impl';
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
    CountKnowledgeChunksUseCase,
    CreateKnowledgeChunkUseCase,
    DeleteKnowledgeChunkUseCase,
    DeleteManyKnowledgeChunksUseCase,
    FindKnowledgeChunksByDepartmentUseCase,
    GetAllKnowledgeChunksUseCase,
    GetKnowledgeChunkUseCase,
    UpdateKnowledgeChunkUseCase,
    CreateKnowledgeChunksProcessor,
  ],
  controllers: [KnowledgeChunkController],
  imports: [
    DepartmentModule,
    BullModule.registerQueue({
      name: 'knowledge-chunks',
    }),
  ],
  exports: [KnowledgeChunkRepository],
})
export class KnowledgeChunkModule {}
