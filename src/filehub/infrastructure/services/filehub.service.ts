import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileHubService,
  SignedPutUrl,
  SignedUrl,
  SignedUrlBatch,
  Upload,
} from 'src/filehub/domain/services/filehub.service';
import ky from 'ky';
import { RedisService } from 'src/shared/infrastructure/redis';
import { FilehubUploadedTempData } from 'src/filehub/application/listeners/filehub.uploaded.listener';
@Injectable()
export class FileHubServiceImpl implements FileHubService {
  private readonly fileHubBaseUrl: string;
  private readonly fileHubApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.fileHubBaseUrl = this.configService.getOrThrow('FILEHUB_BASE_URL');
    this.fileHubApiKey = this.configService.getOrThrow('FILEHUB_API_KEY');
  }

  async generateUploadToken(options: {
    expiresInMs: number;
    targetId?: string;
    userId?: string;
    guestId?: string;
  }): Promise<Upload> {
    if (!this.fileHubApiKey) {
      throw new Error('FileHub API key is not set');
    }
    if (!this.fileHubBaseUrl) {
      throw new Error('FileHub base URL is not set');
    }
    const filehubUploadedTempData: FilehubUploadedTempData = {
      targetId: options.targetId,
      userId: options.userId,
      guestId: options.guestId,
    };
    const response = await ky.post<{
      uploadKey: string;
      uploadExpiry: string /* ISO 8601 */;
    }>(`${this.fileHubBaseUrl}/api/uploads`, {
      headers: {
        Authorization: `Bearer ${this.fileHubApiKey}`,
        'Content-Type': 'application/json',
        'Upload-Expires-In-Ms': options.expiresInMs.toString(),
      },
    });
    const data = await response.json();
    await this.redis.set(
      `filehub:upload:${data.uploadKey}`,
      JSON.stringify(filehubUploadedTempData),
    );
    return {
      uploadKey: data.uploadKey,
      uploadExpiry: new Date(data.uploadExpiry),
    };
  }

  async getSignedUrl(
    objectName: string,
    expiresInMs: number = 3600,
  ): Promise<SignedUrl> {
    if (!this.fileHubApiKey) {
      throw new Error('FileHub API key is not set');
    }
    if (!this.fileHubBaseUrl) {
      throw new Error('FileHub base URL is not set');
    }
    const response = await ky.post<{
      signedUrl: string;
      expirationDate: string /* ISO 8601 */;
    }>(`${this.fileHubBaseUrl}/api/uploads/signed-url`, {
      headers: {
        Authorization: `Bearer ${this.fileHubApiKey}`,
        'Object-Path': objectName,
        'Expires-In': expiresInMs.toString(),
      },
    });
    const data = await response.json();
    return {
      signedUrl: data.signedUrl,
      expirationDate: new Date(data.expirationDate),
    };
  }

  async getSignedUrlBatch(
    fileNames: string[],
    expiresInMs: number = 3600000,
  ): Promise<SignedUrlBatch[]> {
    if (!this.fileHubApiKey) {
      throw new Error('FileHub API key is not set');
    }
    if (!this.fileHubBaseUrl) {
      throw new Error('FileHub base URL is not set');
    }
    if (fileNames.length === 0) {
      return [];
    }
    const response = await ky
      .post<SignedUrlBatch[]>(
        `${this.fileHubBaseUrl}/api/uploads/sign-url/batch`,
        {
          headers: {
            Authorization: `Bearer ${this.fileHubApiKey}`,
            'Content-Type': 'application/json',
          },
          json: {
            filenames: fileNames,
            expiresIn: expiresInMs / 1000,
          },
        },
      )
      .catch((error) => {
        console.error(error);
        throw error;
      });
    const data = await response.json();
    return data;
  }

  async getSignedPutUrl(
    expiresInSeconds: number,
    fileExtension: string,
  ): Promise<SignedPutUrl> {
    if (!this.fileHubApiKey) {
      throw new Error('FileHub API key is not set');
    }
    if (!this.fileHubBaseUrl) {
      throw new Error('FileHub base URL is not set');
    }
    const response = await ky.post<SignedPutUrl>(
      `${this.fileHubBaseUrl}/api/uploads/signed-upload-url`,
      {
        headers: {
          Authorization: `Bearer ${this.fileHubApiKey}`,
          'Expires-In': expiresInSeconds.toString(),
          'File-Extension': fileExtension,
        },
      },
    );
    const data = await response.json();
    return data;
  }
}
