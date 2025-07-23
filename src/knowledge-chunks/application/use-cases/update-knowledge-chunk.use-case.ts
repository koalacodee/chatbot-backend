import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { Vector } from 'src/knowledge-chunks/domain/value-objects/vector.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { VectorsRepository } from 'src/knowledge-chunks/domain/repositories/vectors.repository';

interface UpdateKnowledgeChunkDto {
  content?: string;
  departmentId?: string;
}

@Injectable()
export class UpdateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly departmentRepo: DepartmentRepository,
    private readonly vectorRepo: VectorsRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateKnowledgeChunkDto,
  ): Promise<KnowledgeChunk | null> {
    const chunk = await this.chunkRepo.findById(id);
    if (!chunk) throw new NotFoundException('Knowledge chunk not found');

    if (dto.content) {
      const embedding = await this.embeddingService.generateEmbedding(
        dto.content,
      );

      const vector = Vector.create({
        vector: embedding,
        dim: embedding.length as 2048,
        id: chunk.vector.id.value,
      });

      await this.vectorRepo.save(vector);

      chunk.updateContent(dto.content);
      chunk.updateVector(vector);
    }

    if (dto.departmentId) {
      const department = await this.departmentRepo.findById(dto.departmentId);
      if (!department) throw new NotFoundException('Department not found');
      chunk.updateDepartment(department);
    }

    return this.chunkRepo.save(chunk);
  }
}
