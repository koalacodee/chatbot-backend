import { Module } from '@nestjs/common';
import { QuestionRepository } from './domain/repositories/question.repository';
import { PrismaQuestionRepository } from './infrastructure/repositories/prisma-question.repository';
import { QuestionController } from './interface/http/question.controller';
import {
  CountQuestionsUseCase,
  CreateQuestionUseCase,
  DeleteQuestionUseCase,
  DeleteManyQuestionsUseCase,
  GetAllQuestionsUseCase,
  GetQuestionUseCase,
  UpdateQuestionUseCase,
} from './application/use-cases';
import { KnowledgeChunkModule } from '../knowledge-chunks/knowledge-chunk.module';
import { DepartmentModule } from '../department/department.module';
import { GroupByDepartmentUseCase } from './application/use-cases/group-by-department.use-case';

@Module({
  providers: [
    {
      provide: QuestionRepository,
      useClass: PrismaQuestionRepository,
    },
    CountQuestionsUseCase,
    CreateQuestionUseCase,
    DeleteQuestionUseCase,
    DeleteManyQuestionsUseCase,
    GetAllQuestionsUseCase,
    GetQuestionUseCase,
    UpdateQuestionUseCase,
    GroupByDepartmentUseCase,
  ],
  controllers: [QuestionController],
  imports: [KnowledgeChunkModule, DepartmentModule],
  exports: [QuestionRepository],
})
export class QuestionModule {}
