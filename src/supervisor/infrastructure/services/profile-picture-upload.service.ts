import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

export interface ProfilePictureUploadResult {
  filename: string;
  originalName: string;
  url: string;
}

@Injectable()
export class ProfilePictureUploadService {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly profilePicturesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.profilePicturesDir = join(
      process.cwd(),
      'uploads',
      'profile-pictures',
    );
    this.ensureDirectoryExists();
  }

  async uploadProfilePicture(
    file: NodeJS.ReadableStream,
    originalName: string,
    mimeType: string,
    fileSize: number,
  ): Promise<ProfilePictureUploadResult> {
    // Validate file type
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
      );
    }

    // Validate file size
    if (fileSize > this.maxFileSize) {
      throw new BadRequestException(
        'File size too large. Maximum allowed size is 5MB.',
      );
    }

    // Generate unique filename
    const ext = extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(this.profilePicturesDir, filename);

    try {
      // Create write stream
      const writeStream = createWriteStream(filepath, {
        highWaterMark: 64 * 1024, // 64KB buffer
        flags: 'w',
      });

      // Stream the file to disk
      await pipeline(file, writeStream);

      // Generate URL
      const baseUrl = this.configService.get<string>(
        'BASE_URL',
        'http://localhost:3001',
      );
      const url = `${baseUrl}/supervisor/profile-pictures/${filename}`;

      return {
        filename,
        originalName,
        url,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  getProfilePicturePath(filename: string): string {
    return join(this.profilePicturesDir, filename);
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.profilePicturesDir)) {
      mkdirSync(this.profilePicturesDir, { recursive: true });
    }
  }
}
