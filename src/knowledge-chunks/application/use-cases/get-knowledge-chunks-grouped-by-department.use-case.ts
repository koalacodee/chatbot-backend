import { Injectable } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';

@Injectable()
export class GetKnowledgeChunksGroupedByDepartmentUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly accessControl: AccessControlService,
  ) {}

  async execute(userId: string): Promise<
    {
      departmentId: string;
      knowledgeChunks: Array<ReturnType<KnowledgeChunk['toJSON']>>;
    }[]
  > {
    const groupedChunks = await this.chunkRepo.findAllGroupedByDepartment();

    const result: {
      departmentId: string;
      knowledgeChunks: Array<ReturnType<KnowledgeChunk['toJSON']>>;
    }[] = [];

    for (const group of groupedChunks) {
      try {
        await this.accessControl.canAccessDepartment(
          userId,
          group.departmentId,
        );

        result.push({
          departmentId: group.departmentId,
          knowledgeChunks: group.knowledgeChunks.map((chunk) => chunk.toJSON()),
        });
      } catch {
        // User cannot access this department, skip it
        continue;
      }
    }

    return result;
  }
}
