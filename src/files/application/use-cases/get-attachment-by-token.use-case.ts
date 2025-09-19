import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { AttachmentRepository } from '../../domain/repositories/attachment.repository';
import { RedisService } from 'src/shared/infrastructure/redis';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

interface GetAttachmentByTokenInput {
  token: string;
}

export interface AttachmentStreamResult {
  filePath: string;
  originalName: string;
  contentType: string;
}

@Injectable()
export class GetAttachmentByTokenUseCase {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly redis: RedisService,
  ) {}

  async execute({
    token,
  }: GetAttachmentByTokenInput): Promise<AttachmentStreamResult> {
    console.log('GetAttachmentByTokenUseCase - Processing token:', token);

    // Get attachment ID from Redis
    const redisKey = `attachment:token:${token}`;
    const attachmentId = await this.redis.get(redisKey);

    if (!attachmentId) {
      console.log('GetAttachmentByTokenUseCase - Token not found in Redis');
      throw new NotFoundException('Token not found or expired');
    }

    console.log(
      'GetAttachmentByTokenUseCase - Found attachment ID:',
      attachmentId,
    );

    // Get attachment from database
    const attachment = await this.attachmentRepository.findById(attachmentId);
    if (!attachment) {
      console.log(
        'GetAttachmentByTokenUseCase - Attachment not found in database',
      );
      throw new NotFoundException('Attachment not found');
    }

    console.log('GetAttachmentByTokenUseCase - Attachment details:', {
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      expirationDate: attachment.expirationDate,
    });

    // Check if attachment is still valid (not expired)
    if (attachment.expirationDate <= new Date()) {
      console.log('GetAttachmentByTokenUseCase - Attachment has expired');
      throw new GoneException('Attachment has expired');
    }

    // Construct file path
    const filePath = join(process.cwd(), 'uploads', attachment.filename);
    console.log('GetAttachmentByTokenUseCase - File path:', filePath);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log('GetAttachmentByTokenUseCase - File does not exist on disk');
      throw new NotFoundException('File not found on disk');
    }

    // Get file stats for debugging
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    console.log('GetAttachmentByTokenUseCase - File stats:', {
      size: stats.size,
      isFile: stats.isFile(),
      mtime: stats.mtime,
    });

    // Determine content type based on file extension
    const contentType = this.getContentType(attachment.filename);
    console.log('GetAttachmentByTokenUseCase - Content type:', contentType);

    return {
      filePath,
      originalName: attachment.originalName,
      contentType,
    };
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

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
