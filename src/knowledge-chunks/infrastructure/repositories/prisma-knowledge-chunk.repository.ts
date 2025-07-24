import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';
import { Department } from 'src/department/domain/entities/department.entity';

@Injectable()
export class PrismaKnowledgeChunkRepository extends KnowledgeChunkRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(chunk: any): KnowledgeChunk {
    // NOTE: Vector mapping is not handled here, assumed to be injected/loaded elsewhere
    return KnowledgeChunk.create({
      id: chunk.id,
      content: chunk.content,
      department: undefined as unknown as Department,
    });
  }

  async save(chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
    const data = {
      id: chunk.id.value,
      content: chunk.content,
      departmentId: chunk.department.id.value,
    };
    const upserted = await this.prisma.knowledgeChunk.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.prisma.knowledgeChunk.findUnique({
      where: { id },
    });
    return chunk ? this.toDomain(chunk) : null;
  }

  async findAll(): Promise<KnowledgeChunk[]> {
    const chunks = await this.prisma.knowledgeChunk.findMany();
    return chunks.map(this.toDomain);
  }

  async removeById(id: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.findById(id);
    if (!chunk) return null;
    await this.prisma.knowledgeChunk.delete({ where: { id } });
    return chunk;
  }

  async findByIds(ids: string[]): Promise<KnowledgeChunk[]> {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { id: { in: ids } },
    });
    return chunks.map(this.toDomain);
  }

  async update(
    id: string,
    update: Partial<{
      content: string;
      vectorId: string;
      departmentId: string;
    }>,
  ): Promise<KnowledgeChunk> {
    const data: any = {};
    if (update.content) data.content = update.content;
    if (update.vectorId) data.vectorId = update.vectorId;
    if (update.departmentId) data.departmentId = update.departmentId;
    const updated = await this.prisma.knowledgeChunk.update({
      where: { id },
      data,
    });
    return this.toDomain(updated);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.knowledgeChunk.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.knowledgeChunk.count();
  }

  async findByDepartmentId(departmentId: string): Promise<KnowledgeChunk[]> {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { departmentId },
    });
    return chunks.map(this.toDomain);
  }
}
