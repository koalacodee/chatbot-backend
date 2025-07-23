import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';

class FindKnowledgeChunksByDepartmentDto {
  departmentId: string;
}

@Injectable()
export class FindKnowledgeChunksByDepartmentUseCase {
  constructor(private readonly chunkRepo: KnowledgeChunkRepository) {}

  async execute({
    departmentId,
  }: FindKnowledgeChunksByDepartmentDto): Promise<KnowledgeChunk[]> {
    return this.chunkRepo.findByDepartmentId(departmentId);
  }
}
