import {
  BadRequestException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExportFileService,
  ExportFileStreamResult,
  ExportShareKeyResult,
} from '../../domain/services/export-file.service';
import { ExportRepository } from '../../domain/repositories/export.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { randomInt } from 'crypto';
import { isUUID } from 'class-validator';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import * as OSS from 'ali-oss';

@Injectable()
export class ExportFileServiceImpl extends ExportFileService {
  private readonly shareKeyPrefix = 'exportShareKey:';
  private readonly uploadsDir: string;
  private readonly storageDriver: 'local' | 'ali-oss';
  private readonly ossClient?: OSS;

  constructor(
    private readonly exportRepository: ExportRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.uploadsDir = join(process.cwd(), 'uploads');
    this.storageDriver = this.configService.get<'local' | 'ali-oss'>(
      'FILE_MANAGEMENT_SERVICE',
      'local',
    );

    if (this.storageDriver === 'ali-oss') {
      this.ossClient = new OSS({
        region: this.configService.getOrThrow<string>('OSS_REGION'),
        accessKeyId: this.configService.getOrThrow<string>('OSS_ACCESS_KEY_ID'),
        accessKeySecret: this.configService.getOrThrow<string>(
          'OSS_ACCESS_KEY_SECRET',
        ),
        bucket: this.configService.getOrThrow<string>('OSS_BUCKET'),
        endpoint: this.configService.getOrThrow<string>('OSS_ENDPOINT'),
        timeout: parseInt(
          this.configService.getOrThrow<string>('OSS_TIMEOUT', '300000'),
        ),
        secure: true,
      });
    }
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

    if (this.storageDriver === 'ali-oss') {
      if (!this.ossClient) {
        throw new MethodNotAllowedException('OSS client is not configured');
      }
      const streamResult = await this.ossClient.getStream(objectName);
      return {
        stream: streamResult?.stream ?? null,
        exportId: exportEntity.id,
        objectName,
      };
    }

    const filePath = join(this.uploadsDir, objectName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Export file not found on storage');
    }

    return {
      stream: createReadStream(filePath),
      exportId: exportEntity.id,
      objectName,
    };
  }

  async getSignedUrl(identifier: string): Promise<string | null> {
    const exportEntity = await this.fetchExport(identifier);

    if (this.storageDriver !== 'ali-oss') {
      return null;
    }

    if (!this.ossClient) {
      throw new MethodNotAllowedException('OSS client is not configured');
    }

    return this.ossClient.signatureUrl(exportEntity.objectPath, {
      expires: 3600,
    });
  }
}


