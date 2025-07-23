import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DepartmentRepository } from '../../domain/repositories/department.repository';
import { Department } from '../../domain/entities/department.entity';
import { Question } from '../../../questions/domain/entities/question.entity';
import { KnowledgeChunk } from '../../../knowledge-chunks/domain/entities/knowldege-chunk.entity';

@Injectable()
export class PrismaDepartmentRepository extends DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(dept: any): Department {
    return Department.create({
      id: dept.id,
      name: dept.name,
      questions:
        dept.questions?.map((q: any) =>
          Question.create({
            id: q.id,
            text: q.text,
            departmentId: q.departmentId,
            knowledgeChunkId: q.knowledgeChunkId,
          }),
        ) || [],
      knowledgeChunks:
        dept.knowledgeChunks?.map((kc: any) =>
          KnowledgeChunk.create({
            id: kc.id,
            content: kc.content,
            vector: undefined, // Vector mapping not handled here
            department: undefined as unknown as Department,
          }),
        ) || [],
    });
  }

  async save(department: Department): Promise<Department> {
    const data = {
      id: department.id.value,
      name: department.name,
    };
    const upserted = await this.prisma.department.upsert({
      where: { id: data.id },
      update: data,
      create: data,
      include: { questions: true, knowledgeChunks: true },
    });
    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<Department | null> {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { questions: true, knowledgeChunks: true },
    });
    return dept ? this.toDomain(dept) : null;
  }

  async findByIds(ids: string[]): Promise<Department[]> {
    const depts = await this.prisma.department.findMany({
      where: { id: { in: ids } },
      include: { questions: true, knowledgeChunks: true },
    });
    return depts.map(this.toDomain);
  }

  async findAll(): Promise<Department[]> {
    const depts = await this.prisma.department.findMany({
      include: { questions: true, knowledgeChunks: true },
    });
    return depts.map(this.toDomain);
  }

  async removeById(id: string): Promise<Department | null> {
    const dept = await this.findById(id);
    if (!dept) return null;
    await this.prisma.department.delete({ where: { id } });
    return dept;
  }

  async removeByIds(ids: string[]): Promise<Department[]> {
    const depts = await this.findByIds(ids);
    await this.prisma.department.deleteMany({ where: { id: { in: ids } } });
    return depts;
  }

  async update(id: string, update: Partial<Department>): Promise<Department> {
    const data: any = {};
    if (update.name) data.name = update.name;
    const updated = await this.prisma.department.update({
      where: { id },
      data,
      include: { questions: true, knowledgeChunks: true },
    });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.department.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.department.count();
  }

  async findByCriteria(criteria: Partial<Department>): Promise<Department[]> {
    const where: any = {};
    if (criteria.name) where.name = criteria.name;
    const depts = await this.prisma.department.findMany({
      where,
      include: { questions: true, knowledgeChunks: true },
    });
    return depts.map(this.toDomain);
  }
}
