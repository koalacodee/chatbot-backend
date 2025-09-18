import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { GetAttachmentsByTargetIdsUseCase } from 'src/files/application/use-cases/get-attachments-by-target-ids.use-case';

@Injectable()
export class GetKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
    private readonly getAttachmentsUseCase: GetAttachmentsByTargetIdsUseCase,
  ) {}

  async execute(
    id: string,
    userId: string,
  ): Promise<{
    knowledgeChunk: KnowledgeChunk | null;
    attachments: { [chunkId: string]: string[] };
  }> {
    const chunk = await this.chunkRepo.findById(id);
    if (!chunk) return { knowledgeChunk: null, attachments: {} };
    await this.accessControl.canAccessDepartment(
      userId,
      chunk.department.id.value,
    );

    const attachments = await this.getAttachmentsUseCase.execute({
      targetIds: [chunk.id.toString()],
    });

    return { knowledgeChunk: chunk, attachments };
  }
}
