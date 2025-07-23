import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';

@Injectable()
export class GetAllKnowledgeChunksUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute(): Promise<KnowledgeChunk[]> {
    return this.chunkRepo.findAll();
  }
}
