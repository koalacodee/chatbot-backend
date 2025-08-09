import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { QuestionRepository } from '../../domain/repositories/question.repository';
import { Question } from '../../domain/entities/question.entity';

@Injectable()
export class PrismaQuestionRepository extends QuestionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(q: any): Question {
    return Question.create({
      id: q.id,
      text: q.text,
      departmentId: q.departmentId,
      knowledgeChunkId: q.knowledgeChunkId,
    });
  }

  async save(question: Question): Promise<Question> {
    const data = {
      id: question.id.value,
      text: question.text,
      departmentId: question.departmentId.value,
      knowledgeChunkId: question.knowledgeChunkId?.value,
    };
    const upserted = await this.prisma.question.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Question | null> {
    const q = await this.prisma.question.findUnique({ where: { id } });
    return q ? this.toDomain(q) : null;
  }

  async findAll(): Promise<Question[]> {
    const qs = await this.prisma.question.findMany();
    return qs.map(this.toDomain);
  }

  async removeById(id: string): Promise<Question | null> {
    const q = await this.findById(id);
    if (!q) return null;
    await this.prisma.question.delete({ where: { id } });
    return q;
  }

  async findByIds(ids: string[]): Promise<Question[]> {
    const qs = await this.prisma.question.findMany({
      where: { id: { in: ids } },
    });
    return qs.map(this.toDomain);
  }

  async update(id: string, update: Partial<Question>): Promise<Question> {
    const data: any = {};
    if (update.text) data.text = update.text;
    if (update.departmentId) data.departmentId = update.departmentId.value;
    if (update.knowledgeChunkId)
      data.knowledgeChunkId = update.knowledgeChunkId.value;
    const updated = await this.prisma.question.update({ where: { id }, data });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.question.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.question.count();
  }

  async findByCriteria(criteria: Partial<Question>): Promise<Question[]> {
    const where: any = {};
    if (criteria.text) where.text = criteria.text;
    if (criteria.departmentId) where.departmentId = criteria.departmentId.value;
    if (criteria.knowledgeChunkId)
      where.knowledgeChunkId = criteria.knowledgeChunkId.value;
    const qs = await this.prisma.question.findMany({ where });
    return qs.map(this.toDomain);
  }

  async findByDepartmentId(departmentId: string): Promise<Question[]> {
    const questions = await this.prisma.question.findMany({
      where: { departmentId },
    });

    return questions.map(this.toDomain);
  }
}
