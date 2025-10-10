import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis';
import { FastifyRequest } from 'fastify';

interface UploadRequest extends FastifyRequest {
  targetId?: string;
  userId?: string;
  guestId?: string;
}

@Injectable()
export class FileUploadGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UploadRequest>();

    const token = request.headers['x-upload-key'] as string;
    if (!token) return false;

    const redisKey = `upload:token:${token}`;
    const tokenData = await this.redis.get(redisKey);

    if (!tokenData) return false;

    await this.redis.del(redisKey);

    // Parse token data which should contain targetId, userId, and guestId
    const parsedData = JSON.parse(tokenData);

    request.headers['x-target-id'] = parsedData.targetId;
    if (parsedData.userId) {
      request.headers['x-user-id'] = parsedData.userId;
    }
    if (parsedData.guestId) {
      request.headers['x-guest-id'] = parsedData.guestId;
    }

    return true;
  }
}
