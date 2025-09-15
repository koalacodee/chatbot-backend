import { Module } from '@nestjs/common';
import { DepartmentController } from './interface/http/department.controller';
import { EmbeddingService } from '../shared/embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from '../shared/infrastructure/ai/jina-ai.embedding-service';
import { QuestionRepository } from '../questions/domain/repositories/question.repository';
import { PrismaQuestionRepository } from '../questions/infrastructure/repositories/prisma-question.repository';
import { DepartmentRepository } from './domain/repositories/department.repository';
import { PrismaDepartmentRepository } from './infrastructure/repositories/prisma-department.repository';
import * as UseCases from './application/use-cases';
import { DepartmentHierarchyService } from './application/services/department-hierarchy.service';
@Module({
  controllers: [DepartmentController],
  providers: [
    { provide: QuestionRepository, useClass: PrismaQuestionRepository },
    { provide: DepartmentRepository, useClass: PrismaDepartmentRepository },
    { provide: EmbeddingService, useClass: JinaAiEmbeddingService },
    ...Object.values(UseCases),
    DepartmentHierarchyService,
  ],
  exports: [DepartmentRepository, DepartmentHierarchyService],
})
export class DepartmentModule {}
