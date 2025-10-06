import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfilePictureRepository } from '../../domain/repositories/profile-picture.repository';
import { ProfilePicture } from '../../domain/entities/profile-picture.entity';
import { RedisService } from 'src/shared/infrastructure/redis/redis.service';
import { randomBytes } from 'crypto';
import { extname, join } from 'path';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

export interface UploadProfilePictureRequest {
  userId: string;
  file: NodeJS.ReadableStream;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadProfilePictureResponse {
  profilePicture: ProfilePicture;
  uploadToken: string;
  url: string;
}

@Injectable()
export class UploadProfilePictureUseCase {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly profilePicturesDir: string;

  constructor(
    private readonly profilePictureRepository: ProfilePictureRepository,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.profilePicturesDir = join(
      process.cwd(),
      'uploads',
      'profile-pictures',
    );
    this.ensureDirectoryExists();
  }

  async execute(
    request: UploadProfilePictureRequest,
  ): Promise<UploadProfilePictureResponse> {
    // Validate file type
    if (!this.allowedMimeTypes.includes(request.mimeType)) {
      throw new BadRequestException({
        details: [
          {
            field: 'mimeType',
            message:
              'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
          },
        ],
      });
    }

    // Generate unique filename
    const ext = extname(request.originalName);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(this.profilePicturesDir, filename);

    try {
      // Create write stream with optimized settings for streaming
      const writeStream = createWriteStream(filepath, {
        highWaterMark: 64 * 1024, // 64KB buffer for streaming
        flags: 'w',
      });

      // Stream the file directly to disk without buffering in memory
      await pipeline(request.file, writeStream);

      // Get file stats for size validation
      const { statSync } = require('fs');
      const stats = statSync(filepath);
      const actualFileSize = stats.size;

      // Validate file size after upload
      if (actualFileSize > this.maxFileSize) {
        // Clean up the uploaded file
        const { unlinkSync } = require('fs');
        unlinkSync(filepath);
        throw new BadRequestException({
          details: [
            {
              field: 'fileSize',
              message: 'File size too large. Maximum allowed size is 5MB.',
            },
          ],
        });
      }

      // Create or update profile picture entity
      const existingProfilePicture =
        await this.profilePictureRepository.findByUserId(request.userId);

      let profilePicture: ProfilePicture;
      if (existingProfilePicture) {
        // Update existing profile picture
        existingProfilePicture.filename = filename;
        existingProfilePicture.originalName = request.originalName;
        existingProfilePicture.mimeType = request.mimeType;
        existingProfilePicture.size = actualFileSize;
        existingProfilePicture.updatedAt = new Date();

        profilePicture = await this.profilePictureRepository.save(
          existingProfilePicture,
        );
      } else {
        // Create new profile picture
        profilePicture = ProfilePicture.create({
          userId: request.userId,
          filename,
          originalName: request.originalName,
          mimeType: request.mimeType,
          size: actualFileSize,
        });

        profilePicture =
          await this.profilePictureRepository.save(profilePicture);
      }

      // Generate upload token for immediate access
      const uploadToken = randomBytes(32).toString('base64url');
      const redisKey = `profile_picture:token:${uploadToken}`;

      // Store profile picture ID in Redis with 1 hour expiry
      await this.redisService.set(redisKey, profilePicture.id, 60 * 60);

      // Generate URL
      const baseUrl = this.configService.get<string>(
        'BASE_URL',
        'http://localhost:3001',
      );
      const url = `${baseUrl}/profile/pictures/${profilePicture.id}`;

      return {
        profilePicture,
        uploadToken,
        url,
      };
    } catch (error) {
      console.error('Profile picture upload error:', error);
      throw new BadRequestException({
        details: [
          {
            field: 'file',
            message: `Failed to upload profile picture: ${error.message || 'Unknown error'}`,
          },
        ],
      });
    }
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.profilePicturesDir)) {
      mkdirSync(this.profilePicturesDir, { recursive: true });
    }
  }
}
