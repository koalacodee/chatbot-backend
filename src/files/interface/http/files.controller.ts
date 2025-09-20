import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { extname, join } from 'path';
import { createWriteStream, mkdirSync } from 'fs';
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

      const isExpirationDateValid = expirationDate !== '';
      if (!isExpirationDateValid) {
        return res
          .status(400)
          .send({ error: 'expirationDate field is required' });
      }

      const results = await this.uploadFileUseCase.execute({
        targetId: req.headers['x-target-id'] as any,
        filename: file.filename,
        originalName: file.originalName,
        expirationDate: new Date(expirationDate),
      });

      return res.send(results);
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

      // Filter out empty expiration dates and validate
      const validExpirationDates = expirationDates.filter(
        (date) => date && date.trim() !== '',
      );

      if (validExpirationDates.length === 0) {
        return res
          .status(400)
          .send({ error: 'expirationDates fields are required' });
      }

      // Validate that we have expiration dates for all files
      if (files.length !== validExpirationDates.length) {
        return res.status(400).send({
          error: `Expected ${files.length} expiration dates, but received ${validExpirationDates.length}`,
        });
      }

      const results = await Promise.all(
        files.map((file, index) =>
          this.uploadFileUseCase.execute({
            targetId: req.headers['x-target-id'] as any,
            filename: file.filename,
            originalName: file.originalName,
            expirationDate: new Date(validExpirationDates[index]),
          }),
        ),
      );

      return res.send(results);
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }
}
