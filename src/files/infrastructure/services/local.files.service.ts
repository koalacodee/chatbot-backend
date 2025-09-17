import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/infrastructure/redis';
import { randomBytes } from 'crypto';
import { FilesService } from '../../domain/services/files.service';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';

@Injectable()
export class LocalFilesService implements FilesService {
  constructor(
    private readonly redis: RedisService,
    private readonly attachmentRepository: AttachmentRepository,
  ) {}

  async genUploadKey(targetId: string): Promise<string> {
    const key = randomBytes(32).toString('base64url');

    const redisKey = `upload:token:${key}`;
    await this.redis.set(redisKey, targetId);

    return key;
  }

  async deleteFile(attachmentId: string): Promise<void> {
    await this.redis.del(`upload:token:${attachmentId}`);
  }

  replaceFile(attachmentId: string): string | Promise<string> {
    throw new Error('Method not implemented.');
  }

  async deleteFilesByTargetId(targetId: string): Promise<void> {
    const attachments = await this.attachmentRepository.findByTargetId(targetId);
    
    // Delete all attachments for this target
    for (const attachment of attachments) {
      await this.attachmentRepository.removeById(attachment.id);
    }
  }

  async replaceFilesByTargetId(targetId: string): Promise<string> {
    // First delete existing files
    await this.deleteFilesByTargetId(targetId);
    
    // Generate new upload key for replacement
    return this.genUploadKey(targetId);
  }
}
