import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { EmbeddingService } from 'src/knowledge-chunks/domain/embedding/embedding-service.interface';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { Point } from 'src/shared/entities/point.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

interface UpdateKnowledgeChunkDto {
  content?: string;
  departmentId?: string;
  userId: string;
}

@Injectable()
export class UpdateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly departmentRepo: DepartmentRepository,
    private readonly pointRepo: PointRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(
    id: string,
    dto: UpdateKnowledgeChunkDto,
  ): Promise<KnowledgeChunk | null> {
    const chunk = await this.chunkRepo.findById(id);
    await this.accessControl.canAccessDepartment(
      dto.userId,
      chunk.department.id.value,
    );
    if (!chunk) throw new NotFoundException('Knowledge chunk not found');

    if (dto.content) {
      const embedding = await this.embeddingService.embed(dto.content);

      const vector = Vector.create({
        vector: embedding,
        dim: embedding.length as 2048,
      });

      // Update or create point
      if (chunk.pointId) {
        const updatedPoint = Point.create({
          id: chunk.pointId,
          vector,
        });
        await this.pointRepo.save(updatedPoint);
      } else {
        const newPoint = Point.create({
          vector,
        });
        const savedPoint = await this.pointRepo.save(newPoint);
        chunk.updatePointId(savedPoint.id.value);
      }

      chunk.updateContent(dto.content);
    }

    if (dto.departmentId) {
      const department = await this.departmentRepo.findById(dto.departmentId);
      if (!department) throw new NotFoundException('Department not found');
      chunk.updateDepartment(department);
    }

    return this.chunkRepo.save(chunk);
  }
}
