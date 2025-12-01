import { Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeChunkRepository } from '../../domain/repositories/knowledge-chunk.repository';
import { KnowledgeChunk } from '../../domain/entities/knowledge-chunk.entity';
import { EmbeddingService } from '../../domain/services/embedding.service';
import { Vector } from 'src/shared/value-objects/vector.vo';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { PointRepository } from 'src/knowledge-chunks/domain/repositories/point.repository';
import { Point } from 'src/shared/entities/point.entity';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { FilesService } from 'src/files/domain/services/files.service';
import { DeleteAttachmentsByIdsUseCase } from 'src/files/application/use-cases/delete-attachments-by-ids.use-case';
import { CloneAttachmentUseCase } from 'src/files/application/use-cases/clone-attachment.use-case';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

interface UpdateKnowledgeChunkDto {
  content?: string;
  departmentId?: string;
  userId: string;
  attach?: boolean;
  deleteAttachments?: string[];
  chooseAttachments?: string[];
}

@Injectable()
export class UpdateKnowledgeChunkUseCase {
  constructor(
    private readonly chunkRepo: KnowledgeChunkRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly departmentRepo: DepartmentRepository,
    private readonly pointRepo: PointRepository,
    private readonly accessControl: AccessControlService,
    private readonly filesService: FilesService,
    private readonly deleteAttachmentsUseCase: DeleteAttachmentsByIdsUseCase,
    private readonly cloneAttachmentUseCase: CloneAttachmentUseCase,
    private readonly fileHubService: FileHubService,
  ) {}

  async execute(
    id: string,
    dto: UpdateKnowledgeChunkDto,
  ): Promise<{
    knowledgeChunk: KnowledgeChunk | null;
    uploadKey?: string;
    fileHubUploadKey?: string;
  }> {
    const chunk = await this.chunkRepo.findById(id);
    await this.accessControl.canAccessDepartment(
      dto.userId,
      chunk.department.id.value,
    );
    if (!chunk)
      throw new NotFoundException({
        details: [{ field: 'id', message: 'Knowledge chunk not found' }],
      });

    if (dto.content) {
      const embedding = await this.embeddingService.embed(dto.content, 2048);

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
      if (!department)
        throw new NotFoundException({
          details: [{ field: 'departmentId', message: 'Department not found' }],
        });
      chunk.updateDepartment(department);
    }

    // Handle attachment deletion if specified
    if (dto.deleteAttachments && dto.deleteAttachments.length > 0) {
      await this.deleteAttachmentsUseCase.execute({
        attachmentIds: dto.deleteAttachments,
      });
    }

    const [savedChunk, uploadKey, fileHubUploadKey] = await Promise.all([
      this.chunkRepo.save(chunk),
      dto.attach ? this.filesService.genUploadKey(id, dto.userId) : undefined,
      dto.attach
        ? this.fileHubService
            .generateUploadToken({
              expiresInMs: 1000 * 60 * 60 * 24,
              targetId: id,
              userId: dto.userId,
            })
            .then((upload) => upload.uploadKey)
        : undefined,
    ]);

    // Clone attachments if provided
    if (dto.chooseAttachments && dto.chooseAttachments.length > 0) {
      await this.cloneAttachmentUseCase.execute({
        attachmentIds: dto.chooseAttachments,
        targetId: id,
      });
    }

    return { knowledgeChunk: savedChunk, uploadKey, fileHubUploadKey };
  }
}
