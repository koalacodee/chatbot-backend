import { Injectable, NotFoundException } from '@nestjs/common';
import {
  KnowledgeChunkProcessingService,
  ProcessKnowledgeChunkData,
} from '../../domain/services/knowledge-chunk-processing.service';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';

import { Vector } from 'src/shared/value-objects/vector.vo';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Point } from 'src/shared/entities/point.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmbeddingService } from 'src/knowledge-chunks/domain/services/embedding.service';

@Injectable()
export class KnowledgeChunkProcessingServiceImpl extends KnowledgeChunkProcessingService {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepo: PointRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async processKnowledgeChunk(
    data: ProcessKnowledgeChunkData,
  ): Promise<KnowledgeChunk> {
    const department = await this.departmentRepo.findById(data.departmentId);

    if (!department) {
      throw new NotFoundException({
        details: [{ field: 'departmentId', message: 'Department not found' }],
      });
    }

    // Generate embedding for the content
    const vector = await this.embeddingService.embed(data.content, 2048);
    const vectorObj = Vector.create({
      vector,
      dim: vector.length as 2048,
    });

    // Create the point for vector storage
    const point = Point.create({
      vector: vectorObj,
    });
    const savedPoint = await this.pointRepo.save(point);

    // Create the knowledge chunk
    const chunk = KnowledgeChunk.create({
      content: data.content,
      pointId: savedPoint.id.value,
      department,
    });

    const savedChunk = await this.chunkRepo.save(chunk);

    // Emit event for further processing
    this.eventEmitter.emit('knowledgeChunk.created', {
      knowledgeChunkId: savedChunk.id.toString(),
    });

    return savedChunk;
  }
}
