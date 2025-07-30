import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { Point } from 'src/shared/entities/point.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface CreateKnowledgeChunkDto {
  content: string;
  departmentId: string;
  userId: string;
}

@Injectable()
export class CreateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly pointRepo: PointRepository,
    private readonly departmentRepo: DepartmentRepository,
    private readonly accessControl: AccessControlService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CreateKnowledgeChunkDto): Promise<KnowledgeChunk> {
    await this.accessControl.canAccessDepartment(dto.userId, dto.departmentId);
    const department = await this.departmentRepo.findById(dto.departmentId);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const vector = await this.embeddingService.embed(dto.content);
    const vectorObj = Vector.create({
      vector,
      dim: vector.length as 2048,
    });

    // First create the point
    const point = Point.create({
      vector: vectorObj,
    });
    const savedPoint = await this.pointRepo.save(point);

    // Then create the knowledge chunk with the point ID
    const chunk = KnowledgeChunk.create({
      content: dto.content,
      pointId: savedPoint.id.value,
      department,
    });
    const savedChunk = await this.chunkRepo.save(chunk);

    return this.chunkRepo.save(savedChunk).then((updatedChunk) => {
      this.eventEmitter.emit('knowledgeChunk.created', {
        knowledgeChunkId: updatedChunk.id.toString(),
        pointId: savedPoint.id.value,
      });
      return updatedChunk;
    });
  }
}
