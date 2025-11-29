import { Injectable } from '@nestjs/common';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

export interface GenerateUserUploadTokenInput {
  userId: string;
  expiresInMs?: number;
}

export interface GenerateUserUploadTokenOutput {
  uploadKey: string;
  uploadExpiry: Date;
}

@Injectable()
export class GenerateUserUploadTokenUseCase {
  constructor(private readonly fileHubService: FileHubService) {}

  async execute(
    input: GenerateUserUploadTokenInput,
  ): Promise<GenerateUserUploadTokenOutput> {
    const { userId, expiresInMs = 1000 * 60 * 60 * 24 } = input;

    const upload = await this.fileHubService.generateUploadToken({
      expiresInMs,
      userId,
    });

    return {
      uploadKey: upload.upload_key,
      uploadExpiry: upload.upload_expiry,
    };
  }
}
