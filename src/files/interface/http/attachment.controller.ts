import {
  Controller,
  Get,
  MethodNotAllowedException,
  Param,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { GetAttachmentByTokenUseCase } from '../../application/use-cases/get-attachment-by-token.use-case';
import { GetAttachmentMetadataByTokenUseCase } from '../../application/use-cases/get-attachment-metadata-by-token.use-case';
import { FileManagementClass } from '../../domain/services/file-mangement.service';

@Controller('attachment')
export class AttachmentController {
  constructor(
    private readonly getAttachmentByTokenUseCase: GetAttachmentByTokenUseCase,
    private readonly getAttachmentMetadataByTokenUseCase: GetAttachmentMetadataByTokenUseCase,
    private readonly fileManagementService: FileManagementClass,
  ) {}

  @Get(':tokenOrId')
  async getAttachmentByToken(
    @Param('tokenOrId') tokenOrId: string,
    @Res() res: FastifyReply,
  ) {
    const [result, stream] = await Promise.all([
      this.getAttachmentByTokenUseCase.execute({
        tokenOrId,
      }),
      this.fileManagementService.getFileStream(tokenOrId),
    ]);
    if (!stream) {
      throw new MethodNotAllowedException('File Stream Is Not Supported');
    }
    res.header('Content-Type', result.contentType);
    const encodedFilename = encodeURIComponent(result.originalName);
    res.header(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodedFilename}`,
    );
    res.header('Cache-Control', 'private, max-age=3600');
    res.header('Accept-Ranges', 'bytes');
    return res.send(stream);
  }

  @Get(':tokenOrId/metadata')
  async getAttachmentMetadataByToken(@Param('tokenOrId') tokenOrId: string) {
    return this.getAttachmentMetadataByTokenUseCase.execute({
      token: tokenOrId,
    });
  }

  @Get('signed/:shareKey')
  async getSignedUrlByShareKey(@Param('shareKey') shareKey: string) {
    const signedUrl = await this.fileManagementService.getSignedUrl(shareKey);

    if (!signedUrl) {
      throw new MethodNotAllowedException(
        'Signed URLs are not supported by the current file management service',
      );
    }

    return { signedUrl };
  }
}
