import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { extname, join } from 'path';
import { createWriteStream, mkdirSync, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { UploadFileUseCase } from 'src/files/application/use-cases/upload-file.use-case';
import { FileUploadGuard } from 'src/files/infrastructure/guards/file-upload.guard';
import { UUID } from 'src/shared/value-objects/uuid.vo';

// Type for multipart parts
type MultipartPart = {
  file?: NodeJS.ReadableStream;
  filename?: string;
  fieldname: string;
  value?: string;
};

@Controller('files')
export class FilesController {
  constructor(private readonly uploadFileUseCase: UploadFileUseCase) {}

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

  @Post('single')
  @UseGuards(FileUploadGuard)
  async uploadSingle(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      console.log('Starting single file upload...');
      const parts = req.parts();
      let file: { filename: string; originalName: string };
      const uploadsDir = join(process.cwd(), 'uploads');
      let expirationDate: string = '';

      // Ensure uploads directory exists
      try {
        mkdirSync(uploadsDir, { recursive: true });
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

        const multipartPart = part as MultipartPart;

        if (multipartPart.file && !file) {
          // This part is a file
          console.log('Found file:', multipartPart.filename);
          const ext = extname(multipartPart.filename || '');
          const filename = `${UUID.create().toString()}${ext}`;
          const filepath = join(uploadsDir, filename);

          // Create write stream with optimized settings for streaming
          const writeStream = createWriteStream(filepath, {
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
      });

      // Get file stats for size
      const filePath = join(uploadsDir, file.filename);
      const stats = statSync(filePath);

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
      console.error('Multiple file upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }

  @Post('multiple')
  @UseGuards(FileUploadGuard)
  async uploadMultiple(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      console.log('Starting multiple file upload...');
      const parts = req.parts();
      const files = [];
      const uploadsDir = join(process.cwd(), 'uploads');
      let expirationDates: string[] = [];

      // Ensure uploads directory exists
      try {
        mkdirSync(uploadsDir, { recursive: true });
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

        const multipartPart = part as MultipartPart;

        if (multipartPart.file) {
          // This part is a file
          console.log('Found file:', multipartPart.filename);
          const ext = extname(multipartPart.filename || '');
          const filename = `${UUID.create().toString()}${ext}`;
          const filepath = join(uploadsDir, filename);

          // Create write stream with optimized settings for streaming
          const writeStream = createWriteStream(filepath, {
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
        }
      }

      if (files.length === 0) {
        return res.status(400).send({ error: 'No files uploaded' });
      }

      const results = await Promise.all(
        files.map((file, index) =>
          this.uploadFileUseCase.execute({
            targetId: req.headers['x-target-id'] as any,
            filename: file.filename,
            originalName: file.originalName,
            expirationDate:
              expirationDates[index] && expirationDates[index].trim() !== ''
                ? new Date(expirationDates[index])
                : undefined,
          }),
        ),
      );

      // Get additional file information for each file
      const response = results.map((result, index) => {
        const file = files[index];
        const filePath = join(uploadsDir, file.filename);
        const stats = statSync(filePath);

        const fileType = this.getFileType(file.originalName);
        const contentType = this.getContentType(file.originalName);
        const sizeInBytes = stats.size;

        return {
          ...result.toJSON(),
          fileType,
          sizeInBytes,
          contentType,
        };
      });

      return res.send(response);
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }
}
