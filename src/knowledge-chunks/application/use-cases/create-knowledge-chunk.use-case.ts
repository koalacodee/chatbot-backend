import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { AccessControlService } from 'src/rbac/domain/services/access-control.service';
import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';

interface CreateKnowledgeChunkDto {
  content: string;
  departmentId: string;
  userId: string;
}

@Injectable()
export class CreateKnowledgeChunkUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly accessControl: AccessControlService,
    @InjectQueue('knowledge-chunks')
    private readonly knowledgeChunksQueue: Queue,
  ) {}

  async execute(dto: CreateKnowledgeChunkDto): Promise<KnowledgeChunk> {
    await this.accessControl.canAccessDepartment(dto.userId, dto.departmentId);
    const department = await this.departmentRepo.findById(dto.departmentId);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Add the processing job to the queue
    await this.knowledgeChunksQueue.add('create', {
      content: dto.content,
      departmentId: dto.departmentId,
      userId: dto.userId,
    });

    return KnowledgeChunk.create({ content: dto.content, department });
  }
}
