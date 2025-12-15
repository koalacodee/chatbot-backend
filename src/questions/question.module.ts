import { Module } from '@nestjs/common';
import { QuestionRepository } from './domain/repositories/question.repository';
import { DrizzleQuestionRepository } from './infrastructure/repositories/drizzle-question.repository';
import { QuestionController } from './interface/http/question.controller';
import * as UseCases from './application/use-cases';
import { KnowledgeChunkModule } from '../knowledge-chunks/knowledge-chunk.module';
import { DepartmentModule } from '../department/department.module';
import { FaqCreatedListener } from './application/listeners/faq-created.listener';
import { FaqUpdatedListener } from './application/listeners/faq-updated.listener';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { TranslationModule } from 'src/translation/translation.module';

@Module({
  providers: [
    {
      provide: QuestionRepository,
      useClass: DrizzleQuestionRepository,
    },
    ...Object.values(UseCases),
    FaqCreatedListener,
    FaqUpdatedListener,
  ],
  controllers: [QuestionController],
  imports: [
    KnowledgeChunkModule,
    DepartmentModule,
    ActivityLogModule,
    TranslationModule,
  ],
  exports: [QuestionRepository],
})
export class QuestionModule {}
