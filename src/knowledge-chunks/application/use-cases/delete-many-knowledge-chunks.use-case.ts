import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class DeleteManyKnowledgeChunksUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
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
    await Promise.all(ids.map((id) => this.chunkRepo.removeById(id)));
    return found;
  }
}
