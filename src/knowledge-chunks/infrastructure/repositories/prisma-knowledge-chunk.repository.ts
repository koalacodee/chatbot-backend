// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { Department } from 'src/department/domain/entities/department.entity';

@Injectable()
/** @deprecated */
export class PrismaKnowledgeChunkRepository extends KnowledgeChunkRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(chunk: any): KnowledgeChunk {
    // NOTE: Vector mapping is not handled here, assumed to be injected/loaded elsewhere
    return KnowledgeChunk.create({
      id: chunk.id,
      content: chunk.content,
      pointId: chunk.pointId,
      department: Department.create(chunk.department),
    });
  }

  async save(chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
    const data = {
      id: chunk.id.value,
      content: chunk.content,
      departmentId: chunk.department.id.toString(),
      pointId: chunk.pointId,
    };
    const upsert = await this.prisma.knowledgeChunk.upsert({
      where: { id: data.id },
      update: data,
      create: data,
      include: { department: true },
    });
    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.prisma.knowledgeChunk.findUnique({
      where: { id },
      include: { department: true },
    });
    return chunk ? this.toDomain(chunk) : null;
  }

  async findAll(): Promise<KnowledgeChunk[]> {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      include: { department: true },
    });
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
      include: { department: true },
    });
    return chunks.map(this.toDomain);
  }

  async update(
    id: string,
    update: Partial<{
      content: string;
      pointId: string;
      departmentId: string;
    }>,
  ): Promise<KnowledgeChunk> {
    const data: any = {};
    if (update.content) data.content = update.content;
    if (update.pointId) data.pointId = update.pointId;
    if (update.departmentId) data.departmentId = update.departmentId;
    const updated = await this.prisma.knowledgeChunk.update({
      where: { id },
      data,
      include: { department: true },
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
      include: { department: true },
    });
    return chunks.map(this.toDomain);
  }

  async findByPointIds(pointIds: string[]): Promise<KnowledgeChunk[]> {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { pointId: { in: pointIds } },
      include: { department: true },
    });
    return chunks.map(this.toDomain);
  }
}
