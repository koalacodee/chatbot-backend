import { Module } from '@nestjs/common';
import { DepartmentController } from './interface/http/department.controller';
import { EmbeddingService } from '../knowledge-chunks/domain/embedding/embedding-service.interface';
import { JinaAiEmbeddingService } from '../knowledge-chunks/infrastructure/ai/jina-ai.embedding-service';
import { QuestionRepository } from '../questions/domain/repositories/question.repository';
import { PrismaQuestionRepository } from '../questions/infrastructure/repositories/prisma-question.repository';
import { DepartmentRepository } from './domain/repositories/department.repository';
import { PrismaDepartmentRepository } from './infrastructure/repositories/prisma-department.repository';
import {
  CountDepartmentsUseCase,
  CreateDepartmentUseCase,
  UpdateDepartmentUseCase,
  DeleteDepartmentUseCase,
  DeleteManyDepartmentsUseCase,
  GetAllDepartmentsUseCase,
  GetDepartmentUseCase,
} from './application/use-cases';
@Module({
  controllers: [DepartmentController],
  providers: [
    { provide: QuestionRepository, useClass: PrismaQuestionRepository },
    { provide: DepartmentRepository, useClass: PrismaDepartmentRepository },
    { provide: EmbeddingService, useClass: JinaAiEmbeddingService },
    CountDepartmentsUseCase,
    CreateDepartmentUseCase,
    UpdateDepartmentUseCase,
    DeleteDepartmentUseCase,
    DeleteManyDepartmentsUseCase,
    GetAllDepartmentsUseCase,
    GetDepartmentUseCase,
  ],
  exports: [DepartmentRepository],
})
export class DepartmentModule {}
