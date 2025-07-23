import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';

@Injectable()
export class CountKnowledgeChunksUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute(): Promise<number> {
    return this.chunkRepo.count();
  }
}
