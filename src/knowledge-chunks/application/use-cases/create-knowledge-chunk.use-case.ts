import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowldege-chunk.entity';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { Vector } from 'src/knowledge-chunks/domain/value-objects/vector.vo';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Point } from 'src/knowledge-chunks/domain/entities/point.entity';

interface CreateKnowledgeChunkDto {
  content: string;
  departmentId: string;
}

@Injectable()
export class CreateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepo: PointRepository,
    private readonly departmentRepo: DepartmentRepository,
  ) {}

  async execute(dto: CreateKnowledgeChunkDto): Promise<KnowledgeChunk> {
    const department = await this.departmentRepo.findById(dto.departmentId);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const vector = await this.embeddingService.generateEmbedding(dto.content);
    const vectorObj = Vector.create({
      vector,
      dim: vector.length as 2048,
    });

    // First create the knowledge chunk to get its ID
    const chunk = KnowledgeChunk.create({
      content: dto.content,
      department,
    });
    const savedChunk = await this.chunkRepo.save(chunk);

    // Then create the point with the knowledge chunk ID
    const point = Point.create({
      vector: vectorObj,
      knowledgeChunkId: savedChunk.id.value,
    });
    await this.pointRepo.save(point);

    return this.chunkRepo.save(savedChunk);
  }
}
