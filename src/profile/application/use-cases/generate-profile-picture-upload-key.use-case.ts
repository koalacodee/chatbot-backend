import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { randomBytes } from 'crypto';

export interface GenerateProfilePictureUploadKeyRequest {
  userId: string;
}

export interface GenerateProfilePictureUploadKeyResponse {
  uploadKey: string;
  expiresAt: Date;
}

@Injectable()
export class GenerateProfilePictureUploadKeyUseCase {
  private readonly UPLOAD_KEY_EXPIRY_SECONDS = 60 * 60; // 1 hour

  constructor(private readonly redisService: RedisService) {}

  async execute(
    request: GenerateProfilePictureUploadKeyRequest,
  ): Promise<GenerateProfilePictureUploadKeyResponse> {
    const uploadKey = randomBytes(32).toString('base64url');
    const redisKey = `profile_picture:uploadKey:${uploadKey}`;
    const expiresAt = new Date(
      Date.now() + this.UPLOAD_KEY_EXPIRY_SECONDS * 1000,
    );

    // Store user ID in Redis with 1 hour expiry
    await this.redisService.set(
      redisKey,
      request.userId,
      this.UPLOAD_KEY_EXPIRY_SECONDS,
    );

    return {
      uploadKey,
      expiresAt,
    };
  }
}
