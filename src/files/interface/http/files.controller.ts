import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  UseGuards,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { GetMyAttachmentsUseCase } from 'src/files/application/use-cases/get-my-attachments.use-case';
import { ShareAttachmentUseCase } from 'src/files/application/use-cases/share-attachment.use-case';
import { GenTokenUseCase } from 'src/files/application/use-cases/gen-token.use-case';
import { DeleteMyAttachmentUseCase } from 'src/files/application/use-cases/delete-my-attachment.use-case';
import { FileUploadGuard } from 'src/files/infrastructure/guards/file-upload.guard';
import { UserJwtAuthGuard } from 'src/auth/user/infrastructure/guards/jwt-auth.guard';
import { FileManagementClass } from 'src/files/domain/services/file-mangement.service';

@Controller('files')
export class FilesController {
  constructor(
    private readonly getMyAttachmentsUseCase: GetMyAttachmentsUseCase,
    private readonly shareAttachmentUseCase: ShareAttachmentUseCase,
    private readonly genTokenUseCase: GenTokenUseCase,
    private readonly deleteMyAttachmentUseCase: DeleteMyAttachmentUseCase,
    private readonly fileManagementService: FileManagementClass,
  ) {}

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

  @Get('my-attachments')
  @UseGuards(UserJwtAuthGuard)
  async getMyAttachments(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.getMyAttachmentsUseCase.execute({
      userId,
      limit: limitNum,
      offset: offsetNum,
    });

    // Add metadata and tokens to each attachment
    const attachmentsWithMetadata = result.attachments.map((attachment) => {
      const fileType = this.getFileType(attachment.originalName);
      const contentType = this.getContentType(attachment.originalName);

      return {
        ...attachment.toJSON(),
        fileType,
        contentType,
      };
    });

    return {
      attachments: attachmentsWithMetadata,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    };
  }

  @Post('single')
  @UseGuards(FileUploadGuard)
  async uploadSingle(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.fileManagementService.uploadSingle(req, res);
  }

  @Post('multiple')
  @UseGuards(FileUploadGuard)
  async uploadMultiple(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.fileManagementService.uploadMultiple(req, res);
  }

  @Post('share/:attachmentId')
  @UseGuards(UserJwtAuthGuard)
  async shareAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
    @Body() body: { expirationDate?: string },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    try {
      const expirationDate = body.expirationDate
        ? new Date(body.expirationDate)
        : undefined;

      const result = await this.shareAttachmentUseCase.execute({
        attachmentId,
        userId,
        expirationDate,
      });

      return {
        shareKey: result.shareKey,
        expiresAt: result.expiresAt,
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  @Post('generate-upload-key')
  @UseGuards(UserJwtAuthGuard)
  async generateUploadKey(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    try {
      const uploadKey = await this.genTokenUseCase.execute({
        userId,
      });

      return {
        uploadKey,
        message: 'Upload key generated successfully',
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  @Delete(':attachmentId')
  @UseGuards(UserJwtAuthGuard)
  async deleteMyAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { error: 'User not authenticated' };
    }

    const result = await this.deleteMyAttachmentUseCase.execute({
      attachmentId,
      userId,
    });

    return result;
  }
}
