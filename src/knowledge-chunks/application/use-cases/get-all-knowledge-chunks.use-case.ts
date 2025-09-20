import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { GetAttachmentIdsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachment-ids-by-target-ids.use-case';

@Injectable()
export class GetAllKnowledgeChunksUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
    private readonly getAttachmentsUseCase: GetAttachmentIdsByTargetIdsUseCase,
  ) {}

  async execute(userId: string): Promise<{
    knowledgeChunks: KnowledgeChunk[];
    attachments: { [chunkId: string]: string[] };
  }> {
    const all = await this.chunkRepo.findAll();
    // Filter by department access
    const filteredChunks = (
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

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: filteredChunks.map((chunk) => chunk.id.toString()),
    });

    return { knowledgeChunks: filteredChunks, attachments };
  }
}
