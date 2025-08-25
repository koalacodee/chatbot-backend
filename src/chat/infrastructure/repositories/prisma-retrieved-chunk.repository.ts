import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RetrievedChunkRepository } from '../../domain/repositories/retrieved-chunk.repository';
import { RetrievedChunk } from '../../domain/entities/retrieved-chunk.entity';
@Injectable()
export class PrismaRetrievedChunkRepository extends RetrievedChunkRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toDomain(chunk: any): RetrievedChunk {
    return RetrievedChunk.create({
      id: chunk.id,
      messageId: chunk.messageId,
      knowledgeChunk: chunk.knowledgeChunk,
      score: chunk.score,
      retrievedAt: chunk.retrievedAt,
    });
  }

  async save(chunk: RetrievedChunk): Promise<RetrievedChunk> {
    const data = {
      id: chunk.id,
      messageId: chunk.messageId,
      knowledgeChunkId: chunk.knowledgeChunk.id.value,
      score: chunk.score,
      retrievedAt: chunk.retrievedAt,
    };
    const upsert = await this.prisma.retrievedChunk.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    return this.toDomain(upsert);
  }

  async findById(id: string): Promise<RetrievedChunk | null> {
    const chunk = await this.prisma.retrievedChunk.findUnique({
      where: { id },
      include: { knowledgeChunk: true },
    });
    return chunk ? this.toDomain(chunk) : null;
  }

  async findAll(): Promise<RetrievedChunk[]> {
    const chunks = await this.prisma.retrievedChunk.findMany({
      include: { knowledgeChunk: true },
    });
    return chunks.map(this.toDomain);
  }

  async removeById(id: string): Promise<RetrievedChunk | null> {
    const chunk = await this.findById(id);
    if (!chunk) return null;
    await this.prisma.retrievedChunk.delete({ where: { id } });
    return chunk;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.retrievedChunk.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.retrievedChunk.count();
  }
}
