import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createReadStream, existsSync } from 'fs';
import { UploadProfilePictureUseCase } from '../../application/use-cases/upload-profile-picture.use-case';
import { GetProfilePictureByTokenUseCase } from '../../application/use-cases/get-profile-picture-by-token.use-case';

import { ProfileUploadGuard } from 'src/profile/infrastructure/guards/profile-upload.guard';

// Type for multipart parts
type MultipartPart = {
  file?: NodeJS.ReadableStream;
  filename?: string;
  fieldname: string;
  value?: string;
  mimetype?: string;
};

interface UploadProfilePictureQuery {}

@Controller('profile/pictures')
export class ProfilePictureController {
  constructor(
    private readonly uploadProfilePictureUseCase: UploadProfilePictureUseCase,
    private readonly getProfilePictureByTokenUseCase: GetProfilePictureByTokenUseCase,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ProfileUploadGuard)
  async uploadProfilePicture(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Query() query: UploadProfilePictureQuery,
  ) {
    try {
      console.log('Starting profile picture upload...');
      const parts = req.parts();
      let file: { filename: string; originalName: string } | null = null;

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

          const result = await this.uploadProfilePictureUseCase.execute({
            userId: (req.headers['x-target-id'] as string) || '',
            file: multipartPart.file,
            originalName: multipartPart.filename || 'unknown',
            mimeType: multipartPart.mimetype || 'application/octet-stream',
            fileSize: 0, // We'll calculate this in the use case
          });

          file = {
            filename: result.profilePicture.filename,
            originalName: result.profilePicture.originalName,
          };

          return res.send({
            profilePicture: result.profilePicture.toJSON(),
            uploadToken: result.uploadToken,
            url: result.url,
          });
        }
      }

      if (!file) {
        return res.status(400).send({ error: 'No file uploaded' });
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      return res.status(500).send({ error: 'Profile picture upload failed' });
    }
  }

  @Get(':tokenOrId')
  @HttpCode(HttpStatus.OK)
  async getProfilePicture(
    @Param('tokenOrId') tokenOrId: string,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.getProfilePictureByTokenUseCase.execute({
        tokenOrId,
      });

      if (!existsSync(result.filePath)) {
        return res.status(404).send({ error: 'Profile picture not found' });
      }

      // Set appropriate headers
      res.header('Content-Type', result.mimeType);
      res.header('Content-Length', result.size.toString());
      res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.header(
        'Content-Disposition',
        `inline; filename="${result.originalName}"`,
      );

      // Stream the file
      const fileStream = createReadStream(result.filePath);
      return res.send(fileStream);
    } catch (error) {
      console.error('Error serving profile picture:', error);
      return res.status(500).send({ error: 'Failed to serve profile picture' });
    }
  }
}
