import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { randomInt } from 'crypto';
import { extname } from 'path';
import * as OSS from 'ali-oss';
import { FileManagementClass } from '../../domain/services/file-mangement.service';
import { RedisService } from '../../../shared/infrastructure/redis';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { UUID } from '../../../shared/value-objects/uuid.vo';
import { isUUID } from 'class-validator';
import { AttachmentRepository } from 'src/files/domain/repositories/attachment.repository';

@Injectable()
export class AliOSSFileManagementService implements FileManagementClass {
  private readonly logger = new Logger(AliOSSFileManagementService.name);
  private readonly ossClient: OSS;
  private readonly MIN_PART_SIZE: number = 3 * 1024 * 1024; // 3MB
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly uploadFileUseCase: UploadFileUseCase,
    private readonly attachmentRepository: AttachmentRepository,
  ) {
    // Initialize Ali-OSS client
    this.ossClient = new OSS({
      region: this.config.getOrThrow<string>('OSS_REGION'),
      accessKeyId: this.config.getOrThrow<string>('OSS_ACCESS_KEY_ID'),
      accessKeySecret: this.config.getOrThrow<string>('OSS_ACCESS_KEY_SECRET'),
      bucket: this.config.getOrThrow<string>('OSS_BUCKET'),
      endpoint: this.config.getOrThrow<string>('OSS_ENDPOINT'),
      timeout: parseInt(
        this.config.getOrThrow<string>('OSS_TIMEOUT', '300000'),
      ),
      secure: true,
    });
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
      let expirationDate = '';
      let isGlobal = false;
      let fileSize = 0;

      for await (const part of parts) {
        if (part.type === 'file' && part.file && !file) {
          const multipartPart = part;
          const ext = extname(multipartPart.filename || '');
          const filename = `${UUID.create().toString()}${ext}`;

          const multipartUpload =
            await this.ossClient.initMultipartUpload(filename);
          console.log(
            'Initialized multipart upload with upload ID:',
            multipartUpload.uploadId,
          );

          let buffer = Buffer.alloc(0);
          let partNumber = 1;
          let offset = 0;
          const partsList: { number: number; etag: string }[] = [];

          for await (const chunk of multipartPart.file) {
            buffer = Buffer.concat([buffer, chunk]);

            // لو وصلنا حجم جزء كفاية نرفعه كـ part
            if (buffer.length >= this.MIN_PART_SIZE) {
              const start = offset;
              const end = offset + buffer.length;

              const uploadPartResult = await this.ossClient.uploadPart(
                filename,
                multipartUpload.uploadId,
                partNumber,
                buffer,
                start,
                end,
              );

              console.log(
                `Uploaded part ${partNumber} (${buffer.length} bytes)`,
              );

              partsList.push({
                number: partNumber,
                etag: uploadPartResult.etag,
              });

              offset = end;
              fileSize += buffer.length;
              partNumber++;
              buffer = Buffer.alloc(0); // reset buffer
            }
          }

          // آخر جزء (اللي أقل من 5MB)
          if (buffer.length > 0) {
            const start = offset;
            const end = offset + buffer.length;

            const uploadPartResult = await this.ossClient.uploadPart(
              filename,
              multipartUpload.uploadId,
              partNumber,
              buffer,
              start,
              end,
            );

            console.log(
              `Uploaded final part ${partNumber} (${buffer.length} bytes)`,
            );

            partsList.push({
              number: partNumber,
              etag: uploadPartResult.etag,
            });

            fileSize += buffer.length;
          }

          await this.ossClient.completeMultipartUpload(
            filename,
            multipartUpload.uploadId,
            partsList,
          );

          console.log('✅ Completed multipart upload');
          file = {
            filename,
            originalName: multipartPart.filename || '',
          };
        } else if (
          part.type === 'field' &&
          part.fieldname === 'expirationDate'
        ) {
          expirationDate = part.value as string;
        } else if (part.type === 'field' && part.fieldname === 'isGlobal') {
          isGlobal = part.value === 'true';
        }
      }

      if (!file) {
        return res.status(400).send({ error: 'No file uploaded' });
      }

      const results = await this.uploadFileUseCase.execute({
        targetId: req.headers['x-target-id'] as any,
        filename: file.filename,
        originalName: file.originalName,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        userId: req.headers['x-user-id'] as any,
        guestId: req.headers['x-guest-id'] as any,
        isGlobal,
        size: fileSize,
      });

      const fileType = this.getFileType(file.originalName);
      const contentType = this.getContentType(file.originalName);

      return res.send({
        ...results.toJSON(),
        fileType,
        sizeInBytes: fileSize,
        contentType,
      });
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
      let fileSizes: number[] = [];

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

          try {
            // Upload to Ali-OSS
            const multipartUpload =
              await this.ossClient.initMultipartUpload(filename);
            console.log(
              'Initialized multipart upload with upload ID:',
              multipartUpload.uploadId,
            );

            let buffer = Buffer.alloc(0);
            let partNumber = 1;
            let offset = 0;
            let fileSize = 0;
            const partsList: { number: number; etag: string }[] = [];

            for await (const chunk of multipartPart.file) {
              buffer = Buffer.concat([buffer, chunk]);

              // لو وصلنا حجم جزء كفاية نرفعه كـ part
              if (buffer.length >= this.MIN_PART_SIZE) {
                const start = offset;
                const end = offset + buffer.length;

                const uploadPartResult = await this.ossClient.uploadPart(
                  filename,
                  multipartUpload.uploadId,
                  partNumber,
                  buffer,
                  start,
                  end,
                );

                console.log(
                  `Uploaded part ${partNumber} (${buffer.length} bytes)`,
                );

                partsList.push({
                  number: partNumber,
                  etag: uploadPartResult.etag,
                });

                offset = end;
                fileSize += buffer.length;
                partNumber++;
                buffer = Buffer.alloc(0); // reset buffer
              }
            }

            // آخر جزء (اللي أقل من 5MB)
            if (buffer.length > 0) {
              const start = offset;
              const end = offset + buffer.length;

              const uploadPartResult = await this.ossClient.uploadPart(
                filename,
                multipartUpload.uploadId,
                partNumber,
                buffer,
                start,
                end,
              );

              console.log(
                `Uploaded final part ${partNumber} (${buffer.length} bytes)`,
              );

              partsList.push({
                number: partNumber,
                etag: uploadPartResult.etag,
              });

              fileSize += buffer.length;
            }

            await this.ossClient.completeMultipartUpload(
              filename,
              multipartUpload.uploadId,
              partsList,
            );

            // Store file size for later use
            fileSizes.push(fileSize);

            files.push({
              filename,
              originalName: multipartPart.filename || '',
            });
          } catch (error) {
            this.logger.error(
              `Failed to upload file to OSS: ${filename}`,
              error,
            );
            throw new Error(`OSS upload failed: ${error.message}`);
          }
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
          const meta = await this.ossClient.head(file.filename);

          const fileSize = +meta.res?.headers['content-length'] || 0;

          const fileType = this.getFileType(file.originalName);
          const contentType = this.getContentType(file.originalName);
          const sizeInBytes = fileSize;

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

  async getFileStream(shareKeyOrId: string): Promise<any> {
    // Ali-OSS doesn't support direct streaming, only signed URLs
    this.logger.warn(
      'getFileStream is not supported for Ali-OSS - use getSignedUrl instead',
    );
    return null;
  }

  async getSignedUrl(shareKeyOrId: string): Promise<string | null> {
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
      return this.ossClient.signatureUrl(attachment.filename, {
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour default expiration
      });
    }

    throw new BadRequestException('Invalid share key');
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.ossClient.delete(filename);
      this.logger.log(`Deleted OSS file: ${filename}`);

      // Also clean up any share keys pointing to this file
      await this.cleanupShareKeys(filename);
    } catch (error) {
      this.logger.error(`Failed to delete OSS file: ${filename}`, error);
      throw new Error(`OSS deletion failed: ${error.message}`);
    }
  }

  async deleteMultipleFiles(filenames: string[]): Promise<void> {
    try {
      // Ali-OSS supports batch deletion
      await this.ossClient.deleteMulti(filenames);
      this.logger.log(`Deleted multiple OSS files: ${filenames.join(', ')}`);

      // Clean up share keys for all deleted files
      await Promise.all(
        filenames.map((filename) => this.cleanupShareKeys(filename)),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete multiple OSS files: ${filenames.join(', ')}`,
        error,
      );
      throw new Error(`OSS batch deletion failed: ${error.message}`);
    }
  }

  async deleteByTargetId(targetId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    // For OSS, you might need to list files with a specific prefix and delete them
    this.logger.warn(
      'deleteByTargetId not fully implemented for OSS - requires attachment repository integration',
    );
  }

  async deleteByUserId(userId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    this.logger.warn(
      'deleteByUserId not fully implemented for OSS - requires attachment repository integration',
    );
  }

  async deleteByGuestId(guestId: string): Promise<void> {
    // This would need to be implemented based on your attachment entity structure
    this.logger.warn(
      'deleteByGuestId not fully implemented for OSS - requires attachment repository integration',
    );
  }

  private async cleanupShareKeys(filename: string): Promise<void> {
    try {
      // Use Redis SCAN to find all share keys
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

      // Check each key and delete if it points to our file URL
      for (const key of keys) {
        const storedUrl = await this.redis.get(key);
        if (storedUrl && storedUrl.includes(filename)) {
          await this.redis.del(key);
          this.logger.log(`Cleaned up share key: ${key}`);
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up share keys:', error);
    }
  }
}
