import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import { Request } from 'express';

interface UploadRequest extends Request {
  targetId?: string;
}

@Injectable()
export class FileUploadGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UploadRequest>();

    const token = request.headers['x-upload-key'] as string;
    if (!token) return false;

    const redisKey = `upload:token:${token}`;
    const targetId = await this.redis.get(redisKey);

    if (!targetId) return false;

    await this.redis.del(redisKey);

    request.targetId = targetId;
    return true;
  }
}
