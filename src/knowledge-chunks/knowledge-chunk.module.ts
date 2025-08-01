import { Module } from '@nestjs/common';
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
@Module({
  providers: [
    {
      provide: KnowledgeChunkRepository,
      useClass: PrismaKnowledgeChunkRepository,
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
  exports: [KnowledgeChunkRepository],
})
export class KnowledgeChunkModule {}
