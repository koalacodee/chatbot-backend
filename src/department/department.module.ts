import { Module } from '@nestjs/common';
import { DepartmentController } from './interface/http/department.controller';
import { QuestionRepository } from '../questions/domain/repositories/question.repository';
import { DepartmentRepository } from './domain/repositories/department.repository';
import { DrizzleDepartmentRepository } from './infrastructure/repositories/drizzle-department.repository';
import * as UseCases from './application/use-cases';
import { DepartmentHierarchyService } from './application/services/department-hierarchy.service';
import { DrizzleQuestionRepository } from 'src/questions/infrastructure/repositories/drizzle-question.repository';
@Module({
  controllers: [DepartmentController],
  providers: [
    { provide: QuestionRepository, useClass: DrizzleQuestionRepository },
    { provide: DepartmentRepository, useClass: DrizzleDepartmentRepository },
    ...Object.values(UseCases),
    DepartmentHierarchyService,
  ],
  exports: [DepartmentRepository, DepartmentHierarchyService],
})
export class DepartmentModule {}
