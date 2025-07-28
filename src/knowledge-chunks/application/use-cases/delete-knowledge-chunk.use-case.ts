import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';

@Injectable()
export class DeleteKnowledgeChunkUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute(id: string): Promise<KnowledgeChunk | null> {
    return this.chunkRepo.removeById(id);
  }
}
