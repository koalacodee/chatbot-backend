import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';
import { FilesService } from 'src/files/domain/services/files.service';

interface CreateKnowledgeChunkDto {
  content: string;
  departmentId: string;
  userId: string;
  attach?: boolean;
}

@Injectable()
export class CreateKnowledgeChunkUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly accessControl: AccessControlService,
    private readonly filesService: FilesService,
    @InjectQueue('knowledge-chunks')
    private readonly knowledgeChunksQueue: Queue,
  ) {}

  async execute(
    dto: CreateKnowledgeChunkDto,
  ): Promise<{ knowledgeChunk: KnowledgeChunk; uploadKey?: string }> {
    await this.accessControl.canAccessDepartment(dto.userId, dto.departmentId);
    const department = await this.departmentRepo.findById(dto.departmentId);

    if (!department) {
      throw new NotFoundException({
        details: [{ field: 'departmentId', message: 'Department not found' }],
      });
    }

    const knowledgeChunk = KnowledgeChunk.create({
      content: dto.content,
      department,
    });

    // Add the processing job to the queue
    await this.knowledgeChunksQueue.add('create', {
      content: dto.content,
      departmentId: dto.departmentId,
      userId: dto.userId,
    });

    const uploadKey = dto.attach
      ? await this.filesService.genUploadKey(
          knowledgeChunk.id.toString(),
          dto.userId,
        )
      : undefined;

    return { knowledgeChunk, uploadKey };
  }
}
