import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { RedisService as RedisServiceClass } from 'src/shared/infrastructure/redis/redis.service';
import { isUUID } from 'class-validator';

export interface GetProfilePictureByTokenRequest {
  tokenOrId: string;
}

export interface ProfilePictureStreamResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
}

@Injectable()
export class GetProfilePictureByTokenUseCase {
  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
    private readonly redisService: RedisServiceClass,
  ) {}

  async execute(
    request: GetProfilePictureByTokenRequest,
  ): Promise<ProfilePictureStreamResult> {
    let profilePicture: any;

    // Check if the input is a UUID (ID) or a token
    if (isUUID(request.tokenOrId)) {
      // Direct ID lookup - get profile picture from database
      profilePicture = await this.profilePictureRepository.findById(
        request.tokenOrId,
      );
      if (!profilePicture) {
        throw new NotFoundException('Profile picture not found');
      }
    } else {
      // Token-based lookup - get profile picture ID from Redis
      const redisKey = `profile_picture:token:${request.tokenOrId}`;
      const profilePictureId = await this.redisService.get(redisKey);

      if (!profilePictureId) {
        throw new NotFoundException('Token not found or expired');
      }

      // Get profile picture from database
      profilePicture =
        await this.profilePictureRepository.findById(profilePictureId);
      if (!profilePicture) {
        throw new NotFoundException('Profile picture not found');
      }
    }

    // Generate file path
    const { join } = require('path');
    const filePath = join(
      process.cwd(),
      'uploads',
      'profile-pictures',
      profilePicture.filename,
    );

    return {
      filename: profilePicture.filename,
      originalName: profilePicture.originalName,
      mimeType: profilePicture.mimeType,
      size: profilePicture.size,
      filePath,
    };
  }
}
