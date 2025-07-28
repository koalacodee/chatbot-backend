import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';

@Injectable()
export class DeleteManyKnowledgeChunksUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute(ids: string[]): Promise<KnowledgeChunk[]> {
    return this.chunkRepo.findByIds(ids).then(async (found) => {
      await Promise.all(ids.map((id) => this.chunkRepo.removeById(id)));
      return found;
    });
  }
}
