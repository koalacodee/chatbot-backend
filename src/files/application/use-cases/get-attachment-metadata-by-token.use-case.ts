import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { isUUID } from 'class-validator';

interface GetAttachmentMetadataByTokenInput {
  token: string;
}

export interface AttachmentMetadataResult {
  fileType: string;
  originalName: string;
  sizeInBytes: number;
  expiryDate: Date | null;
  tokenExpiryDate?: Date;
  contentType: string;
}

@Injectable()
export class GetAttachmentMetadataByTokenUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly redis: RedisService,
  ) {}

  async execute({
    token,
  }: GetAttachmentMetadataByTokenInput): Promise<AttachmentMetadataResult> {
    console.log(
      'GetAttachmentMetadataByTokenUseCase - Processing token:',
      token,
    );

    let attachment: any;
    let tokenExpiryDate: Date | undefined;

    // Check if the input is a UUID (ID) or a token
    if (isUUID(token)) {
      console.log(
        'GetAttachmentMetadataByTokenUseCase - Input is UUID, querying database directly',
      );
      // Direct ID lookup - get attachment from database
      attachment = await this.attachmentRepository.findById(token);
      if (!attachment) {
        console.log(
          'GetAttachmentMetadataByTokenUseCase - Attachment not found in database',
        );
        throw new NotFoundException({
          details: [{ field: 'attachmentId', message: 'Attachment not found' }],
        });
      }
    } else {
      console.log(
        'GetAttachmentMetadataByTokenUseCase - Input is token, checking Redis',
      );
      // Token-based lookup - get attachment ID from Redis
      const redisKey = `attachment:token:${token}`;
      const attachmentId = await this.redis.get(redisKey);

      if (!attachmentId) {
        console.log(
          'GetAttachmentMetadataByTokenUseCase - Token not found in Redis',
        );
        throw new NotFoundException({
          details: [{ field: 'token', message: 'Token not found or expired' }],
        });
      }

      console.log(
        'GetAttachmentMetadataByTokenUseCase - Found attachment ID:',
        attachmentId,
      );

      // Get attachment from database
      attachment = await this.attachmentRepository.findById(attachmentId);
      if (!attachment) {
        console.log(
          'GetAttachmentMetadataByTokenUseCase - Attachment not found in database',
        );
        throw new NotFoundException({
          details: [{ field: 'attachmentId', message: 'Attachment not found' }],
        });
      }

      // Get token expiry date for token-based requests
      const ttl = await this.redis.execCommand('ttl', redisKey);
      if (ttl > 0) {
        tokenExpiryDate = new Date(Date.now() + ttl * 1000);
      }
    }

    console.log('GetAttachmentMetadataByTokenUseCase - Attachment details:', {
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      expirationDate: attachment.expirationDate,
    });

    // Check if attachment is still valid (not expired)
    if (attachment.expirationDate && attachment.expirationDate <= new Date()) {
      console.log(
        'GetAttachmentMetadataByTokenUseCase - Attachment has expired',
      );
      throw new GoneException('Attachment has expired');
    }

    // Construct file path
    const filePath = join(process.cwd(), 'uploads', attachment.filename);
    console.log('GetAttachmentMetadataByTokenUseCase - File path:', filePath);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(
        'GetAttachmentMetadataByTokenUseCase - File does not exist on disk',
      );
      throw new NotFoundException({
        details: [{ field: 'file', message: 'File not found on disk' }],
      });
    }

    // Get file stats for size
    const stats = statSync(filePath);
    console.log('GetAttachmentMetadataByTokenUseCase - File stats:', {
      size: stats.size,
      isFile: stats.isFile(),
      mtime: stats.mtime,
    });

    // Determine file type based on file extension
    const fileType = this.getFileType(attachment.filename);
    console.log('GetAttachmentMetadataByTokenUseCase - File type:', fileType);

    // Determine content type based on file extension
    const contentType = this.getContentType(attachment.filename);
    console.log(
      'GetAttachmentMetadataByTokenUseCase - Content type:',
      contentType,
    );

    return {
      fileType,
      originalName: attachment.originalName,
      sizeInBytes: stats.size,
      expiryDate: attachment.expirationDate,
      tokenExpiryDate,
      contentType,
    };
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
      bmp: 'image',
      svg: 'image',
      ico: 'image',
      tiff: 'image',
      tif: 'image',

      // Documents
      pdf: 'document',
      txt: 'document',
      doc: 'document',
      docx: 'document',
      xls: 'document',
      xlsx: 'document',
      ppt: 'document',
      pptx: 'document',

      // Archives
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      tar: 'archive',
      gz: 'archive',

      // Videos
      mp4: 'video',
      avi: 'video',
      mov: 'video',
      wmv: 'video',
      flv: 'video',
      webm: 'video',

      // Audio
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      aac: 'audio',
      flac: 'audio',

      // Code
      js: 'code',
      css: 'code',
      html: 'code',
      htm: 'code',
      xml: 'code',
      json: 'code',
    };

    return fileTypes[ext || ''] || 'unknown';
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const contentTypes: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      tiff: 'image/tiff',
      tif: 'image/tiff',

      // Documents
      pdf: 'application/pdf',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Videos
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      flac: 'audio/flac',

      // Code
      js: 'application/javascript',
      css: 'text/css',
      html: 'text/html',
      htm: 'text/html',
      xml: 'application/xml',
      json: 'application/json',
    };

    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}
