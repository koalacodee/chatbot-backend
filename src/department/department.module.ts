import { Module } from '@nestjs/common';
import { DepartmentController } from './interface/http/department.controller';
import { VectorsRepository } from '../knowledge-chunks/domain/repositories/vectors.repository';
import { QdrantVectorsRepository } from '../knowledge-chunks/infrastructure/repositories/qdrant-vectors.repository';
import { EmbeddingService } from '../knowledge-chunks/domain/embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from '../knowledge-chunks/infrastructure/ai/jina-ai.embedding-service';
import { QuestionRepository } from '../questions/domain/repositories/question.repository';
import { PrismaQuestionRepository } from '../questions/infrastructure/repositories/prisma-question.repository';
import { DepartmentRepository } from './domain/repositories/department.repository';
import { PrismaDepartmentRepository } from './infrastructure/repositories/prisma-department.repository';

@Module({
  controllers: [DepartmentController],
  providers: [
    { provide: VectorsRepository, useClass: QdrantVectorsRepository },
    { provide: QuestionRepository, useClass: PrismaQuestionRepository },
    { provide: DepartmentRepository, useClass: PrismaDepartmentRepository },
    { provide: EmbeddingService, useClass: JinaAiEmbeddingService },
  ],
})
export class DepartmentModule {}
