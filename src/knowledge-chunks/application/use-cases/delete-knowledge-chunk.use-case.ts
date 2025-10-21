import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { FilesService } from 'src/files/domain/services/files.service';

@Injectable()
export class DeleteKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly pointRepo: PointRepository,
    private readonly accessControl: AccessControlService,
    private readonly filesService: FilesService,
  ) {}

  async execute(id: string, userId: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.chunkRepo.findById(id);
    if (!chunk) return null;
    await this.accessControl.canAccessDepartment(
      userId,
      chunk.department.id.value,
    );

    // Delete associated files
    await this.filesService.deleteFilesByTargetId(id);

    // Delete the associated point if it exists
    if (chunk.pointId) {
      await this.pointRepo.removeById(chunk.pointId);
    }

    return this.chunkRepo.removeById(id);
  }
}
