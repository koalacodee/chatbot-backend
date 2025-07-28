import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class GetAllKnowledgeChunksUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(userId: string): Promise<KnowledgeChunk[]> {
    const all = await this.chunkRepo.findAll();
    // Filter by department access
    return (
      await Promise.all(
        all.map(async (chunk) => {
          try {
            await this.accessControl.canAccessDepartment(
              userId,
              chunk.department.id.value,
            );
            return chunk;
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean) as KnowledgeChunk[];
  }
}
