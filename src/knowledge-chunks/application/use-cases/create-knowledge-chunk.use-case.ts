import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { Vector } from 'src/knowledge-chunks/domain/value-objects/vector.vo';
import { VectorsRepository } from 'src/knowledge-chunks/domain/repositories/vectors.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';

interface CreateKnowledgeChunkDto {
  content: string;
  departmentId: string;
}

@Injectable()
export class CreateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorRepo: VectorsRepository,
    private readonly departmentRepo: DepartmentRepository,
  ) {}

  async execute(dto: CreateKnowledgeChunkDto): Promise<KnowledgeChunk> {
    const department = await this.departmentRepo.findById(dto.departmentId);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const vector = await this.embeddingService.generateEmbedding(dto.content);

    const newVector = await this.vectorRepo.save(
      Vector.create({
        vector,
        dim: vector.length as 2048,
      }),
    );

    const chunk = KnowledgeChunk.create({
      content: dto.content,
      vector: newVector,
      department,
    });
    return this.chunkRepo.save(chunk);
  }
}
