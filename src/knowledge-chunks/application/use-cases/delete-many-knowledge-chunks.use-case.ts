import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { FilesService } from 'src/files/domain/services/files.service';

@Injectable()
export class DeleteManyKnowledgeChunksUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly pointRepo: PointRepository,
    private readonly accessControl: AccessControlService,
    private readonly filesService: FilesService,
  ) {}

  async execute(ids: string[], userId: string): Promise<KnowledgeChunk[]> {
    const found = await this.chunkRepo.findByIds(ids);
    // Check access for each chunk
    await Promise.all(
      found.map((chunk) =>
        this.accessControl.canAccessDepartment(
          userId,
          chunk.department.id.value,
        ),
      ),
    );

    // Delete associated files first
    await Promise.all(
      ids.map((id) => this.filesService.deleteFilesByTargetId(id)),
    );

    // Delete associated points
    const pointIds = found
      .map((chunk) => chunk.pointId)
      .filter((pointId): pointId is string => pointId !== null);

    if (pointIds.length > 0) {
      await this.pointRepo.removeByIds(pointIds);
    }

    // Then delete the knowledge chunks
    await Promise.all(ids.map((id) => this.chunkRepo.removeById(id)));
    return found;
  }
}
