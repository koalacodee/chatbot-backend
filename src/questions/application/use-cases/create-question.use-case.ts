import { Injectable } from '@nestjs/common';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

interface CreateQuestionDto {
  text: string;
  departmentId: string;
  knowledgeChunkId?: string;
  userId: string;
  answer?: string;
}

@Injectable()
export class CreateQuestionUseCase {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(dto: CreateQuestionDto): Promise<Question> {
    await this.accessControl.canAccessDepartment(dto.userId, dto.departmentId);
    const question = Question.create({
      text: dto.text,
      departmentId: dto.departmentId,
      knowledgeChunkId: dto.knowledgeChunkId,
      answer: dto.answer,
    });
    return this.questionRepo.save(question);
  }
}
