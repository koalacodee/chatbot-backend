import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExportFileService,
  ExportFileStreamResult,
  ExportShareKeyResult,
} from '../../domain/services/export-file.service';
import { ExportRepository } from '../../domain/repositories/export.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { randomInt } from 'crypto';
import { isUUID } from 'class-validator';
import { Readable } from 'stream';
import ky from 'ky';
import { FileHubService } from 'src/filehub/domain/services/filehub.service';

@Injectable()
export class ExportFileServiceImpl extends ExportFileService {
  private readonly shareKeyPrefix = 'exportShareKey:';
  private readonly signedUrlTtlMs = 3600 * 1000;
  private readonly downloadTimeoutMs = 300000;

  constructor(
    private readonly exportRepository: ExportRepository,
    private readonly redisService: RedisService,
    private readonly fileHubService: FileHubService,
  ) {
    super();
  }

  private async resolveExportId(identifier: string): Promise<string> {
    if (isUUID(identifier)) {
      return identifier;
    }

    const redisKey = `${this.shareKeyPrefix}${identifier}`;
    const exportId = await this.redisService.get(redisKey);
    if (!exportId) {
      throw new BadRequestException('Invalid or expired share key');
    }
    return exportId;
  }

  private async fetchExport(identifier: string) {
    const exportId = await this.resolveExportId(identifier);
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new NotFoundException('Export not found');
    }
    return exportEntity;
  }

  async genShareKey(
    exportId: string,
    expiresIn: number = 3600,
  ): Promise<ExportShareKeyResult> {
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new NotFoundException('Export not found');
    }

    const shareKey = randomInt(1000000000, 10000000000).toString();
    await this.redisService.set(
      `${this.shareKeyPrefix}${shareKey}`,
      exportEntity.id,
      expiresIn,
    );

    const expiresAt =
      expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null;

    return { shareKey, expiresAt };
  }

  async getFileStream(identifier: string): Promise<ExportFileStreamResult> {
    const exportEntity = await this.fetchExport(identifier);
    const objectName = exportEntity.objectPath;

    const { signedUrl } = await this.fileHubService.getSignedUrl(
      objectName,
      this.signedUrlTtlMs,
    );

    const response = await ky.get(signedUrl, {
      timeout: this.downloadTimeoutMs,
      throwHttpErrors: false,
    });

    if (response.status === 404) {
      throw new NotFoundException('Export file not found on storage');
    }

    if (!response.ok || !response.body) {
      throw new NotFoundException('Export file could not be read from storage');
    }

    return {
      stream: Readable.fromWeb(response.body),
      exportId: exportEntity.id,
      objectName,
    };
  }

  async getSignedUrl(identifier: string): Promise<string | null> {
    const exportEntity = await this.fetchExport(identifier);

    const { signedUrl } = await this.fileHubService.getSignedUrl(
      exportEntity.objectPath,
      this.signedUrlTtlMs,
    );

    return signedUrl;
  }
}
