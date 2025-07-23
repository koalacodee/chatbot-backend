import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';

@Injectable()
export class GetKnowledgeChunkUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute(id: string): Promise<KnowledgeChunk | null> {
    return this.chunkRepo.findById(id);
  }
}
