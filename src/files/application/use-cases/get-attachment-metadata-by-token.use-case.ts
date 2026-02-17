import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
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
    let attachment: any;
    let tokenExpiryDate: Date | undefined;

    // Check if the input is a UUID (ID) or a token
    if (isUUID(token)) {
      // Direct ID lookup - get attachment from database
      attachment = await this.attachmentRepository.findById(token);
      if (!attachment) {
        throw new NotFoundException({
          details: [{ field: 'attachmentId', message: 'Attachment not found' }],
        });
      }
    } else {
      // Token-based lookup - get attachment ID from Redis
      const redisKey = `shareKey:${token}`;
      const attachmentId = await this.redis.get(redisKey);

      if (!attachmentId) {
        throw new NotFoundException({
          details: [{ field: 'token', message: 'Token not found or expired' }],
        });
      }

      // Get attachment from database
      attachment = await this.attachmentRepository.findById(attachmentId);
      if (!attachment) {
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

    // Check if attachment is still valid (not expired)
    if (attachment.expirationDate && attachment.expirationDate <= new Date()) {
      throw new GoneException('Attachment has expired');
    }

    // Determine file type based on file extension
    const fileType = this.getFileType(attachment.filename);

    // Determine content type based on file extension
    const contentType = this.getContentType(attachment.filename);

    return {
      fileType,
      originalName: attachment.originalName,
      sizeInBytes: attachment.size,
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
