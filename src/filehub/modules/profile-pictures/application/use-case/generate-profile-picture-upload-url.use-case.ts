import { Injectable } from '@nestjs/common';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';
import { RedisService } from 'src/shared/infrastructure/redis';
import { ProfilePicture } from '../../domain/entities/profile.picture.entity';

export interface GenerateProfilePictureUploadUrlInput {
  userId: string;
  fileExtension: string;
}

export interface GenerateProfilePictureUploadUrlOutput {
  signedUrl: string;
  expirationDate: Date;
}

@Injectable()
export class GenerateProfilePictureUploadUrlUseCase {
  constructor(
    private readonly fileHubService: FileHubService,
    private readonly redis: RedisService,
  ) {}

  async execute(
    input: GenerateProfilePictureUploadUrlInput,
  ): Promise<GenerateProfilePictureUploadUrlOutput> {
    const { signedUrl, expirationDate, filename } =
      await this.fileHubService.getSignedPutUrl(3600, input.fileExtension);

    await this.redis.set(`profile:upload:${filename}`, input.userId);
    return { signedUrl, expirationDate };
  }
}
