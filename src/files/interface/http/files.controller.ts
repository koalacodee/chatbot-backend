import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { extname, join } from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { UploadFileUseCase } from 'src/files/application/use-cases/upload-file.use-case';
import { FileUploadGuard } from 'src/files/infrastructure/guards/file-upload.guard';
import { UUID } from 'src/shared/value-objects/uuid.vo';

@Controller('files')
export class FilesController {
  constructor(private readonly uploadFileUseCase: UploadFileUseCase) {}

  @Post('single')
  @UseGuards(FileUploadGuard)
  async uploadSingle(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      // Configure multipart options for better streaming
      const data = await req.file({
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB limit
        },
        // Don't buffer files in memory - stream directly
        preservePath: false,
      });

      if (!data) {
        return res.status(400).send({ error: 'No file uploaded' });
      }

      const ext = extname(data.filename);
      const filename = `${UUID.create().toString()}${ext}`;
      const uploadsDir = join(process.cwd(), 'uploads');

      // Ensure uploads directory exists
      try {
        mkdirSync(uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      const filepath = join(uploadsDir, filename);

      // Create write stream with highWaterMark for better streaming performance
      const writeStream = createWriteStream(filepath, {
        highWaterMark: 64 * 1024, // 64KB buffer for streaming
        flags: 'w',
      });

      // Stream the file directly to disk without buffering in memory
      await pipeline(data.file, writeStream);

      const result = await this.uploadFileUseCase.execute({
        targetId: (req as any).targetId,
        filename: filename,
      });

      return res.send(result);
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).send({ error: 'File upload failed' });
    }
  }

  @Post('multiple')
  @UseGuards(FileUploadGuard)
  async uploadMultiple(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      const files = [];
      const uploadsDir = join(process.cwd(), 'uploads');

      // Ensure uploads directory exists
      try {
        mkdirSync(uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      // Configure multipart options for better streaming
      const parts = req.files({
        limits: {
          fileSize: 100 * 1024 * 1024, // 100MB limit per file
          files: 10, // Maximum 10 files
        },
        preservePath: false,
      });

      for await (const part of parts) {
        if (part.file) {
          const ext = extname(part.filename);
          const filename = `${UUID.create().toString()}${ext}`;
          const filepath = join(uploadsDir, filename);

          // Create write stream with optimized settings for streaming
          const writeStream = createWriteStream(filepath, {
            highWaterMark: 64 * 1024, // 64KB buffer for streaming
            flags: 'w',
          });

          // Stream the file directly to disk without buffering in memory
          await pipeline(part.file, writeStream);

          files.push(filename);
        }
      }

      if (files.length === 0) {
        return res.status(400).send({ error: 'No files uploaded' });
      }

      const results = await Promise.all(
        files.map((filename) =>
          this.uploadFileUseCase.execute({
            targetId: (req as any).targetId,
            filename: filename,
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
