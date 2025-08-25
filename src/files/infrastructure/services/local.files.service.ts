import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/infrastructure/redis';
import { randomBytes } from 'crypto';
import { FilesService } from '../../domain/services/files.service';

@Injectable()
export class LocalFilesService implements FilesService {
  constructor(private readonly redis: RedisService) {}

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
}
