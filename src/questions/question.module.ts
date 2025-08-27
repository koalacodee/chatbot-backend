import { Module } from '@nestjs/common';
import { QuestionRepository } from './domain/repositories/question.repository';
import { PrismaQuestionRepository } from './infrastructure/repositories/prisma-question.repository';
import { QuestionController } from './interface/http/question.controller';
import * as UseCases from './application/use-cases';
import { KnowledgeChunkModule } from '../knowledge-chunks/knowledge-chunk.module';
import { DepartmentModule } from '../department/department.module';

@Module({
  providers: [
    {
      provide: QuestionRepository,
      useClass: PrismaQuestionRepository,
    },
    ...Object.values(UseCases),
  ],
  controllers: [QuestionController],
  imports: [KnowledgeChunkModule, DepartmentModule],
  exports: [QuestionRepository],
})
export class QuestionModule {}
