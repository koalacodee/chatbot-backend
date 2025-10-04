import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import type { FastifyRequest } from 'fastify';

interface UploadRequest extends FastifyRequest {
  headers: Record<string, any> & { 'x-target-id'?: string };
}

@Injectable()
export class ProfileUploadGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UploadRequest>();

    const token = request.headers['x-upload-key'] as string;
    if (!token) return false;

    const redisKey = `profile_picture:upload_key:${token}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) return false;

    await this.redis.del(redisKey);

    request.headers['x-target-id'] = userId;
    return true;
  }
}
