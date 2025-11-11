import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  ReadStream,
  createReadStream,
  existsSync,
  unlinkSync,
  mkdirSync,
  statSync,
  createWriteStream,
} from 'fs';
import { join, extname } from 'path';
import { randomBytes, randomInt } from 'crypto';
import { pipeline } from 'stream/promises';
import { FileManagementClass, UploadFromAsyncGeneratorOutput } from '../../domain/services/file-mangement.service';
import { RedisService } from '../../../shared/infrastructure/redis';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { UUID } from '../../../shared/value-objects/uuid.vo';
import { isUUID } from 'class-validator';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';

@Injectable()
export class LocalFileManagementService implements FileManagementClass {
  private readonly logger = new Logger(LocalFileManagementService.name);
  private readonly uploadsDir: string;

  constructor(
    private readonly redis: RedisService,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly attachmentRepository: AttachmentRepository,
  ) {
    this.uploadsDir = join(process.cwd(), 'uploads');
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      rtf: 'application/rtf',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      aac: 'audio/aac',

      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Code
      js: 'application/javascript',
      ts: 'application/typescript',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',

      // Default
      default: 'application/octet-stream',
    };

    return mimeTypes[ext || ''] || mimeTypes.default;
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const fileTypes: { [key: string]: string } = {
      // Images
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      svg: 'image',
      bmp: 'image',
      ico: 'image',

      // Documents
      pdf: 'document',
      doc: 'document',
      docx: 'document',
      xls: 'document',
      xlsx: 'document',
      ppt: 'document',
      pptx: 'document',
      txt: 'document',
      rtf: 'document',

      // Audio
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      m4a: 'audio',
      aac: 'audio',

      // Video
      mp4: 'video',
      avi: 'video',
      mov: 'video',
      wmv: 'video',
      flv: 'video',
      webm: 'video',

      // Archives
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      tar: 'archive',
      gz: 'archive',

      // Code
      js: 'code',
      ts: 'code',
      json: 'code',
      xml: 'code',
      html: 'code',
      css: 'code',

      // Default
      default: 'unknown',
    };

    return fileTypes[ext || ''] || fileTypes.default;
  }

  async uploadSingle(req: FastifyRequest, res: FastifyReply): Promise<any> {
    try {
      console.log('Starting single file upload...');
      const parts = req.parts();
      let file: { filename: string; originalName: string } | null = null;
      let expirationDate: string = '';
      let isGlobal: boolean = false;

      // Ensure uploads directory exists
      try {
        mkdirSync(this.uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      // Process each part of the multipart form
      for await (const part of parts) {
        console.log('Processing part:', {
          fieldname: part.fieldname,
          filename: (part as any).filename,
          hasFile: !!(part as any).file,
        });

        const multipartPart = part as any;

        if (multipartPart.file && !file) {
          // This part is a file
          console.log('Found file:', multipartPart.filename);
          const ext = extname(multipartPart.filename || '');
          const filename = `${UUID.create().toString()}${ext}`;
          const filepath = join(this.uploadsDir, filename);

          // Create write stream with optimized settings for streaming
          const writeStream = require('fs').createWriteStream(filepath, {
            highWaterMark: 64 * 1024, // 64KB buffer for streaming
            flags: 'w',
          });
          // Stream the file directly to disk without buffering in memory
          await pipeline(multipartPart.file, writeStream);

          file = {
            filename,
            originalName: multipartPart.filename || '',
          };
        } else if (multipartPart.fieldname === 'expirationDate') {
          // This part is an expiration date field
          console.log(
            'Found expiration date field:',
            multipartPart.fieldname,
            multipartPart.value,
          );

          expirationDate = multipartPart.value;
        } else if (multipartPart.fieldname === 'isGlobal') {
          // This part is an isGlobal field
          console.log(
            'Found isGlobal field:',
            multipartPart.fieldname,
            multipartPart.value,
          );

          isGlobal = multipartPart.value === 'true';
        }
      }

      if (!file) {
        return res.status(400).send({ error: 'No file uploaded' });
      }

      // Get file stats for size
      const filePath = join(this.uploadsDir, file.filename);
      const stats = statSync(filePath);

      const results = await this.uploadFileUseCase.execute({
        targetId: req.headers['x-target-id'] as any,
        filename: file.filename,
        originalName: file.originalName,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        userId: req.headers['x-user-id'] as any,
        guestId: req.headers['x-guest-id'] as any,
        isGlobal,
        size: stats.size,
      });

      // Get additional file information
      const fileType = this.getFileType(file.originalName);
      const contentType = this.getContentType(file.originalName);
      const sizeInBytes = stats.size;

      // Return the attachment data with additional fields
      const response = {
        ...results.toJSON(),
        fileType,
        sizeInBytes,
        contentType,
      };

      return res.send(response);
    } catch (error) {
      console.error('Single file upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }

  async uploadMultiple(req: FastifyRequest, res: FastifyReply): Promise<any> {
    try {
      console.log('Starting multiple file upload...');
      const parts = req.parts();
      const files: { filename: string; originalName: string }[] = [];
      let expirationDates: string[] = [];
      let isGlobalValues: boolean[] = [];

      // Ensure uploads directory exists
      try {
        mkdirSync(this.uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      // Process each part of the multipart form
      for await (const part of parts) {
        console.log('Processing part:', {
          fieldname: part.fieldname,
          filename: (part as any).filename,
          hasFile: !!(part as any).file,
        });

        const multipartPart = part as any;

        if (multipartPart.file) {
          // This part is a file
          console.log('Found file:', multipartPart.filename);
          const ext = extname(multipartPart.filename || '');
          const filename = `${UUID.create().toString()}${ext}`;
          const filepath = join(this.uploadsDir, filename);

          // Create write stream with optimized settings for streaming
          const writeStream = require('fs').createWriteStream(filepath, {
            highWaterMark: 64 * 1024, // 64KB buffer for streaming
            flags: 'w',
          });

          // Stream the file directly to disk without buffering in memory
          await pipeline(multipartPart.file, writeStream);

          files.push({
            filename,
            originalName: multipartPart.filename || '',
          });
        } else if (multipartPart.fieldname?.startsWith('expirationDates[')) {
          // This part is an expiration date field like expirationDates[0], expirationDates[1], etc.
          console.log(
            'Found expiration date field:',
            multipartPart.fieldname,
            multipartPart.value,
          );

          // Extract index from fieldname like "expirationDates[0]" -> 0
          const match = multipartPart.fieldname.match(
            /expirationDates\[(\d+)\]/,
          );
          if (match) {
            const index = parseInt(match[1], 10);
            // Ensure the array is large enough
            while (expirationDates.length <= index) {
              expirationDates.push('');
            }
            expirationDates[index] = multipartPart.value || '';
          }
        } else if (multipartPart.fieldname?.startsWith('isGlobalValues[')) {
          // This part is an isGlobal field like isGlobalValues[0], isGlobalValues[1], etc.
          console.log(
            'Found isGlobal field:',
            multipartPart.fieldname,
            multipartPart.value,
          );

          // Extract index from fieldname like "isGlobalValues[0]" -> 0
          const match = multipartPart.fieldname.match(
            /isGlobalValues\[(\d+)\]/,
          );
          if (match) {
            const index = parseInt(match[1], 10);
            // Ensure the array is large enough
            while (isGlobalValues.length <= index) {
              isGlobalValues.push(false);
            }
            isGlobalValues[index] = multipartPart.value === 'true';
          }
        }
      }

      if (files.length === 0) {
        return res.status(400).send({ error: 'No files uploaded' });
      }

      const results = await Promise.all(
        files.map(async (file, index) => {
          const filePath = join(this.uploadsDir, file.filename);
          const stats = statSync(filePath);

          const fileType = this.getFileType(file.originalName);
          const contentType = this.getContentType(file.originalName);
          const sizeInBytes = stats.size;

          const uploaded = await this.uploadFileUseCase.execute({
            targetId: req.headers['x-target-id'] as any,
            filename: file.filename,
            originalName: file.originalName,
            expirationDate:
              expirationDates[index] && expirationDates[index].trim() !== ''
                ? new Date(expirationDates[index])
                : undefined,
            userId: req.headers['x-user-id'] as any,
            guestId: req.headers['x-guest-id'] as any,
            isGlobal: isGlobalValues[index] ?? false,
            size: sizeInBytes,
          });

          return {
            ...uploaded.toJSON(),
            fileType,
            sizeInBytes,
            contentType,
          };
        }),
      );

      return res.send(results);
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }

  async genShareKey(attachmentId: string, expiresIn: number): Promise<string> {
    const shareKey = randomInt(1000000000, 10000000000).toString();
    const redisKey = `shareKey:${shareKey}`;

    // Store attachmentId in Redis with expiration
    await this.redis.set(redisKey, attachmentId, expiresIn);

    return shareKey;
  }

  async getFileStream(shareKeyOrId: string): Promise<ReadStream | null> {
    let attachmentId: string | null = shareKeyOrId;
    if (!isUUID(shareKeyOrId)) {
      const redisKey = `shareKey:${shareKeyOrId}`;
      attachmentId = await this.redis.get(redisKey);
      if (!attachmentId) {
        throw new BadRequestException('Invalid share key');
      }
    }

    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (attachment) {
      return createReadStream(join(this.uploadsDir, attachment.filename));
    }

    throw new BadRequestException('Invalid share key');
  }

  async getSignedUrl(shareKeyOrId: string): Promise<string | null> {
    // Local file system doesn't support signed URLs
    this.logger.warn('getSignedUrl is not supported for local file system');
    return null;
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = join(this.uploadsDir, filename);

    if (existsSync(filepath)) {
      unlinkSync(filepath);
      this.logger.log(`Deleted local file: ${filename}`);

      // Also clean up any share keys pointing to this file
      await this.cleanupShareKeys(filename);
    } else {
      this.logger.warn(`File not found for deletion: ${filename}`);
    }
  }

  async deleteMultipleFiles(filenames: string[]): Promise<void> {
    await Promise.all(filenames.map((filename) => this.deleteFile(filename)));
  }

  async deleteByTargetId(targetId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    // For now, just log that it's not implemented for local files
    this.logger.warn(
      'deleteByTargetId not fully implemented for local files - requires attachment repository integration',
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    this.logger.warn(
      'deleteByUserId not fully implemented for local files - requires attachment repository integration',
    );
  }

  async deleteByGuestId(guestId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    this.logger.warn(
      'deleteByGuestId not fully implemented for local files - requires attachment repository integration',
    );
  }

  private async cleanupShareKeys(filename: string): Promise<void> {
    try {
      // Use Redis SCAN to find all share keys pointing to this file
      const pattern = 'shareKey:*';
      const keys: string[] = [];

      let cursor: string = '0';
      do {
        const result = await this.redis
          .getClient()
          .scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      // Check each key and delete if it points to our file
      for (const key of keys) {
        const storedFilename = await this.redis.get(key);
        if (storedFilename === filename) {
          await this.redis.del(key);
          this.logger.log(`Cleaned up share key: ${key}`);
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up share keys:', error);
    }
  }

  async uploadFromAsyncGenerator(objectName: string, generator: AsyncGenerator<Buffer>): Promise<UploadFromAsyncGeneratorOutput> {
    const filepath = join(this.uploadsDir, objectName);
    const writeStream = createWriteStream(filepath);
    for await (const chunk of generator) {
      writeStream.write(chunk);
    }
    writeStream.end();
    return { objectName, bytesUploaded: writeStream.bytesWritten };
  }
}
