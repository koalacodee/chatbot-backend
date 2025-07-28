import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class GetKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(id: string, userId: string): Promise<KnowledgeChunk | null> {
    const chunk = await this.chunkRepo.findById(id);
    if (!chunk) return null;
    await this.accessControl.canAccessDepartment(
      userId,
      chunk.department.id.value,
    );
    return chunk;
  }
}
